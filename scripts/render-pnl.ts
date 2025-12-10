/**
 * Renders the P&L exactly as the /pnl tab does (KH Brokers View)
 * Uses the same parsing, calculation logic, and account mappings
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CSV Parser (from src/lib/csvParser.ts) ============

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(str: string): number {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(/[$,"]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const month = parts[0].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}`;
}

function extractAccountCode(accountFullName: string): { code: string; parentCode: string | null } {
  if (!accountFullName) return { code: '', parentCode: null };
  const parts = accountFullName.split(':');
  if (parts.length === 1) {
    const match = accountFullName.match(/^(\d{4})/);
    return { code: match ? match[1] : '', parentCode: null };
  }
  const lastPart = parts[parts.length - 1].trim();
  const parentPart = parts[0].trim();
  const codeMatch = lastPart.match(/^(\d{4})/);
  const parentMatch = parentPart.match(/^(\d{4})/);
  return {
    code: codeMatch ? codeMatch[1] : '',
    parentCode: parentMatch ? parentMatch[1] : null
  };
}

function isPnLAccount(code: string): boolean {
  const num = parseInt(code, 10);
  return num >= 4000 && num < 8000;
}

function extractSectionCode(sectionHeader: string): string {
  const match = sectionHeader.match(/^(\d{4})/);
  return match ? match[1] : '';
}

interface Transaction {
  id: string;
  transactionDate: string;
  month: string;
  accountCode: string;
  parentAccountCode: string | null;
  amount: number;
  name: string;
  memo: string;
}

function parseCSV(csvContent: string) {
  const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const transactions: Transaction[] = [];

  let currentSection: string | null = null;
  let currentSectionCode: string | null = null;
  let txnIndex = 0;

  for (let i = 5; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,,,,,,,') continue;
    if (line.startsWith('Total for')) continue;

    const sectionMatch = line.match(/^([^,]+),,,,,,,,,$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      currentSectionCode = extractSectionCode(currentSection);
      continue;
    }

    if (!currentSectionCode || !isPnLAccount(currentSectionCode)) continue;

    const fields = parseCSVLine(line);
    const dateField = fields[1];
    if (!dateField || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) continue;

    const accountFullName = currentSection!;
    const { code, parentCode } = extractAccountCode(accountFullName);
    const month = parseMonth(dateField);

    transactions.push({
      id: `txn-${dateField.replace(/\//g, '-')}-${txnIndex}`,
      transactionDate: dateField,
      month,
      accountCode: code,
      parentAccountCode: parentCode,
      amount: parseAmount(fields[8]),
      name: fields[4] || '',
      memo: fields[6] || ''
    });
    txnIndex++;
  }

  return { transactions };
}

// ============ Exclusions Parser ============

interface Exclusion {
  date: string;
  accountCode: string;
  amount: number;
  category: string;
}

function parseExclusionsCSV(csvContent: string): Exclusion[] {
  const lines = csvContent.trim().split('\n');
  const exclusions: Exclusion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length >= 8) {
      exclusions.push({
        date: fields[0],
        accountCode: fields[4],
        amount: parseFloat(fields[5]) || 0,
        category: fields[6]
      });
    }
  }
  return exclusions;
}

interface TransactionTag {
  category: string;
  subAccount: string;
}

function matchExclusionsToTransactions(
  exclusions: Exclusion[],
  transactions: Transaction[]
): Record<string, TransactionTag> {
  const tags: Record<string, TransactionTag> = {};

  for (const exclusion of exclusions) {
    const match = transactions.find(txn => {
      const dateMatch = txn.transactionDate === exclusion.date;
      const amountMatch = Math.abs(txn.amount - exclusion.amount) < 0.01;
      const accountMatch = txn.accountCode === exclusion.accountCode;
      return dateMatch && amountMatch && accountMatch && !tags[txn.id];
    });

    if (match) {
      tags[match.id] = {
        category: exclusion.category.includes('Personal') || exclusion.category === 'Discretionary' ? 'personal' : 'nonRecurring',
        subAccount: exclusion.category
      };
    }
  }

  return tags;
}

// ============ KH Brokers Mapping (from KHBrokersView.tsx) ============

const KH_MAPPING = {
  income: {
    'Sales': ['4000', '4030'],
    'Discounts': ['4010'],
    'Refunds': ['4020'],
    'Chargebacks': ['4040'],
  },
  cogs: {
    'Product Costs': ['5000', '5030', '5040', '5050'],
    'Shipping & Fulfillment': ['5010', '6010', '6020', '6035'],
  },
  expenses: {
    'Google Ads': { accounts: ['6110'], filter: (t: Transaction) => t.name.toLowerCase().includes('google') },
    'Facebook Ads': { accounts: ['6110'], filter: (t: Transaction) => t.name.toLowerCase().includes('facebook') || t.name.toLowerCase().includes('facebk') },
    'Other Paid Ads': { accounts: ['6110'], filter: (t: Transaction) => !t.name.toLowerCase().includes('google') && !t.name.toLowerCase().includes('facebook') && !t.name.toLowerCase().includes('facebk') },
    'Processing Fees': { accounts: ['6055', '6065', '6075'] },
    'Affiliate / Creator Payouts': { accounts: ['6120', '6125'] },
    'Marketing Agencies': { accounts: ['6130'] },
    'Shopify Apps': { accounts: ['6070'] },
    'Marketing Software': { accounts: ['6140'] },
    'Virtual Assistants / Contractors': { accounts: ['6240'] },
    'Other Software': { accounts: ['6375'] },
    'Accounting': { accounts: ['6330'] },
    'Other Expenses': { accounts: ['6100', '6150', '6210', '6250', '6260', '6290', '6300', '6320', '6390', '6410', '6450', '6470', '6495'] },
  }
};

// ============ Main ============

const csvPath = path.join(__dirname, '../src/data/all-txn.csv');
const exclusionsPath = path.join(__dirname, '../src/data/exclusions.csv');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const exclusionsContent = fs.readFileSync(exclusionsPath, 'utf-8');

const { transactions: allTransactions } = parseCSV(csvContent);
const exclusions = parseExclusionsCSV(exclusionsContent);
const tags = matchExclusionsToTransactions(exclusions, allTransactions);

// TTM: Dec 2024 through Nov 2025
const months = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];

// Filter to TTM and exclude tagged
const transactions = allTransactions.filter(t => months.includes(t.month) && !tags[t.id]);

// Calculate amounts helper
function calcAmounts(
  accountCodes: string[],
  filter?: (t: Transaction) => boolean
): { monthly: Record<string, number>; ytd: number } {
  const monthly: Record<string, number> = {};
  months.forEach(m => { monthly[m] = 0; });
  let ytd = 0;

  for (const txn of transactions) {
    if (accountCodes.includes(txn.accountCode)) {
      if (!filter || filter(txn)) {
        if (monthly[txn.month] !== undefined) {
          monthly[txn.month] += txn.amount;
          ytd += txn.amount;
        }
      }
    }
  }

  return { monthly, ytd };
}

// Format currency
const fmt = (n: number) => {
  const abs = Math.abs(n);
  const formatted = '$' + Math.round(abs).toLocaleString('en-US');
  return n < 0 ? `(${formatted})` : formatted;
};

// Format month
const fmtMonth = (m: string) => {
  const [year, month] = m.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Calculate all sections
const incomeItems: { label: string; monthly: Record<string, number>; ytd: number }[] = [];
let totalIncomeMonthly: Record<string, number> = {};
let totalIncomeYtd = 0;
months.forEach(m => { totalIncomeMonthly[m] = 0; });

for (const [label, accounts] of Object.entries(KH_MAPPING.income)) {
  const { monthly, ytd } = calcAmounts(accounts);
  incomeItems.push({ label, monthly, ytd });
  months.forEach(m => { totalIncomeMonthly[m] += monthly[m]; });
  totalIncomeYtd += ytd;
}

const cogsItems: { label: string; monthly: Record<string, number>; ytd: number }[] = [];
let totalCogsMonthly: Record<string, number> = {};
let totalCogsYtd = 0;
months.forEach(m => { totalCogsMonthly[m] = 0; });

for (const [label, accounts] of Object.entries(KH_MAPPING.cogs)) {
  const { monthly, ytd } = calcAmounts(accounts);
  cogsItems.push({ label, monthly, ytd });
  months.forEach(m => { totalCogsMonthly[m] += monthly[m]; });
  totalCogsYtd += ytd;
}

const grossProfitMonthly: Record<string, number> = {};
months.forEach(m => { grossProfitMonthly[m] = totalIncomeMonthly[m] - totalCogsMonthly[m]; });
const grossProfitYtd = totalIncomeYtd - totalCogsYtd;

const expenseItems: { label: string; monthly: Record<string, number>; ytd: number }[] = [];
let totalExpensesMonthly: Record<string, number> = {};
let totalExpensesYtd = 0;
months.forEach(m => { totalExpensesMonthly[m] = 0; });

for (const [label, config] of Object.entries(KH_MAPPING.expenses)) {
  const accounts = 'accounts' in config ? config.accounts : config;
  const filter = 'filter' in config ? config.filter : undefined;
  const { monthly, ytd } = calcAmounts(accounts as string[], filter as ((t: Transaction) => boolean) | undefined);

  if (ytd !== 0) {
    expenseItems.push({ label, monthly, ytd });
    months.forEach(m => { totalExpensesMonthly[m] += monthly[m]; });
    totalExpensesYtd += ytd;
  }
}

const netProfitMonthly: Record<string, number> = {};
months.forEach(m => { netProfitMonthly[m] = grossProfitMonthly[m] - totalExpensesMonthly[m]; });
const netProfitYtd = grossProfitYtd - totalExpensesYtd;

// ============ Render Output ============

const COL_WIDTH = 12;
const LABEL_WIDTH = 32;

function pad(s: string, width: number, right = false): string {
  if (right) return s.padStart(width);
  return s.padEnd(width);
}

function printHeader() {
  let header = pad('Account', LABEL_WIDTH);
  for (const m of months) {
    header += pad(fmtMonth(m), COL_WIDTH, true);
  }
  header += pad('TTM Total', COL_WIDTH + 2, true);
  console.log(header);
  console.log('─'.repeat(header.length));
}

function printRow(label: string, monthly: Record<string, number>, ytd: number, bold = false) {
  let row = pad(label, LABEL_WIDTH);
  for (const m of months) {
    row += pad(fmt(monthly[m]), COL_WIDTH, true);
  }
  row += '  ' + pad(fmt(ytd), COL_WIDTH, true);
  if (bold) {
    console.log('\x1b[1m' + row + '\x1b[0m');
  } else {
    console.log(row);
  }
}

function printSeparator() {
  console.log('─'.repeat(LABEL_WIDTH + (months.length * COL_WIDTH) + COL_WIDTH + 2));
}

function printSection(title: string) {
  console.log('\n\x1b[1m\x1b[4m' + title + '\x1b[0m');
  printHeader();
}

// Print Income
printSection('INCOME');
for (const item of incomeItems) {
  printRow(item.label, item.monthly, item.ytd);
}
printSeparator();
printRow('Total Income', totalIncomeMonthly, totalIncomeYtd, true);

// Print COGS
printSection('COST OF GOODS SOLD');
for (const item of cogsItems) {
  printRow(item.label, item.monthly, item.ytd);
}

// Print Gross Profit
console.log('\n\x1b[1m\x1b[42m\x1b[30m GROSS PROFIT \x1b[0m');
printHeader();
const gpMargin = totalIncomeYtd !== 0 ? (grossProfitYtd / totalIncomeYtd * 100).toFixed(1) : '0.0';
printRow(`Gross Profit (${gpMargin}% margin)`, grossProfitMonthly, grossProfitYtd, true);

// Print Expenses
printSection('OPERATING EXPENSES');
for (const item of expenseItems) {
  printRow('  ' + item.label, item.monthly, item.ytd);
}
printSeparator();
printRow('Total Expenses', totalExpensesMonthly, totalExpensesYtd, true);

// Print Net Profit
console.log('\n\x1b[1m\x1b[44m\x1b[37m NET PROFIT \x1b[0m');
printHeader();
const npMargin = totalIncomeYtd !== 0 ? (netProfitYtd / totalIncomeYtd * 100).toFixed(1) : '0.0';
printRow(`Net Profit (${npMargin}% margin)`, netProfitMonthly, netProfitYtd, true);

// Summary
console.log('\n' + '═'.repeat(60));
console.log('\x1b[1mSUMMARY\x1b[0m');
console.log('═'.repeat(60));
console.log(`TTM Revenue:     ${fmt(totalIncomeYtd)}`);
console.log(`TTM Gross Profit:${fmt(grossProfitYtd)} (${gpMargin}% margin)`);
console.log(`TTM Net Profit:  ${fmt(netProfitYtd)} (${npMargin}% margin)`);
console.log(`\nExcluded:        ${Object.keys(tags).length} transactions ($${Math.round(allTransactions.filter(t => months.includes(t.month) && tags[t.id]).reduce((s, t) => s + t.amount, 0)).toLocaleString()})`);
