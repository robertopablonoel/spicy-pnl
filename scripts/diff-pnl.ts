/**
 * Script to parse the transaction CSV and calculate P&L
 * Compare against QuickBooks P&L to find discrepancies
 *
 * Run with: npx tsx scripts/diff-pnl.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Parse CSV line handling quoted fields
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

// Parse amount
function parseAmount(str: string): number {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(/[$,"]/g, '');
  return parseFloat(cleaned) || 0;
}

// Parse date to month key
function getMonth(dateStr: string): string {
  if (!dateStr) return '';
  const [month, , year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}`;
}

// Month names for display
const MONTH_NAMES: Record<string, string> = {
  '2025-01': 'January 2025',
  '2025-02': 'February 2025',
  '2025-03': 'March 2025',
  '2025-04': 'April 2025',
  '2025-05': 'May 2025',
  '2025-06': 'June 2025',
  '2025-07': 'July 2025',
  '2025-08': 'August 2025',
  '2025-09': 'September 2025',
  '2025-10': 'October 2025',
  '2025-11': 'November 2025',
};

interface Transaction {
  date: string;
  month: string;
  type: string;
  num: string;
  name: string;
  class: string;
  memo: string;
  account: string;
  accountCode: string;
  amount: number;
  sectionHeader: string;
}

// Extract account code from account name - get the LAST code in hierarchical names
function extractAccountCode(accountName: string): string {
  // For hierarchical names like "6100 Advertising & Marketing:6120 Affiliate Marketing Expense"
  // We want the LAST code (6120), not the first
  const parts = accountName.split(':');
  const lastPart = parts[parts.length - 1].trim();
  const match = lastPart.match(/^(\d{4})/);
  return match ? match[1] : '';
}

// Extract code from section header (always first part)
function extractSectionCode(sectionHeader: string): string {
  const match = sectionHeader.match(/^(\d{4})/);
  return match ? match[1] : '';
}

// Check if code is a P&L account
function isPnLAccount(code: string): boolean {
  const num = parseInt(code, 10);
  return num >= 4000 && num < 8000;
}

// Parse the transaction CSV - CORRECT APPROACH
// Only include transactions from P&L account sections, using the section header as the account
function parseTransactions(csvPath: string): Transaction[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const transactions: Transaction[] = [];
  let currentSection: string | null = null;
  let currentSectionCode: string | null = null;

  for (let i = 5; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,,,,,,,') continue;
    if (line.startsWith('Total for')) continue;

    // Check for ANY section header (lines ending with ,,,,,,,,,)
    // These can be numeric like "4000 Sales,,,,,,,,," or non-numeric like "Credit Card,,,,,,,,,"
    const sectionMatch = line.match(/^([^,]+),,,,,,,,,$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      currentSectionCode = extractSectionCode(currentSection);
      continue;
    }

    // Skip if we're not in a P&L section
    if (!currentSectionCode || !isPnLAccount(currentSectionCode)) {
      continue;
    }

    const fields = parseCSVLine(line);
    const dateField = fields[1];

    // Must have a valid date
    if (!dateField || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) continue;

    // Use the current section as the account (this is the KEY FIX)
    // The column 8 account shows the offsetting entry (bank account), not the P&L account
    const account = currentSection!;
    const accountCode = currentSectionCode!;

    transactions.push({
      date: dateField,
      month: getMonth(dateField),
      type: fields[2] || '',
      num: fields[3] || '',
      name: fields[4] || '',
      class: fields[5] || '',
      memo: fields[6] || '',
      account: account,
      accountCode: accountCode,
      amount: parseAmount(fields[8]),
      sectionHeader: currentSection!
    });
  }

  return transactions;
}

// Parse expected P&L
function parseExpectedPnL(csvPath: string): Map<string, Map<string, number>> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // Map: accountCode -> month -> amount
  const expected = new Map<string, Map<string, number>>();

  const months = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'
  ];

  for (let i = 6; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('Total for') || line.startsWith('Gross Profit') ||
        line.startsWith('Net ') || line.startsWith('Income') ||
        line.startsWith('Cost of Sales') || line.startsWith('Expenses') ||
        line.startsWith('Other')) continue;

    const fields = parseCSVLine(line);
    const accountName = fields[0];
    if (!accountName) continue;

    const accountCode = extractSectionCode(accountName);
    if (!accountCode) continue;

    const monthlyAmounts = new Map<string, number>();
    for (let m = 0; m < months.length; m++) {
      const amount = parseAmount(fields[m + 1]);
      if (amount !== 0) {
        monthlyAmounts.set(months[m], amount);
      }
    }

    if (monthlyAmounts.size > 0) {
      expected.set(accountCode, monthlyAmounts);
    }
  }

  return expected;
}

// Calculate P&L from transactions
function calculatePnL(transactions: Transaction[]): Map<string, Map<string, number>> {
  const pnl = new Map<string, Map<string, number>>();

  for (const txn of transactions) {
    if (!pnl.has(txn.accountCode)) {
      pnl.set(txn.accountCode, new Map());
    }
    const accountMap = pnl.get(txn.accountCode)!;
    const current = accountMap.get(txn.month) || 0;
    accountMap.set(txn.month, current + txn.amount);
  }

  return pnl;
}

// Format currency
function fmt(n: number): string {
  if (n === 0) return '-';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${formatted})` : formatted;
}

// Main
const txnPath = path.join(__dirname, '../public/all-txn.csv');
const expectedPath = path.join(__dirname, '../public/pnl-to-diff-against.csv');

console.log('Parsing transactions (P&L sections only)...');
const transactions = parseTransactions(txnPath);
console.log(`Found ${transactions.length} P&L transactions\n`);

// Debug: show transactions by section
const bySection = new Map<string, number>();
for (const txn of transactions) {
  bySection.set(txn.accountCode, (bySection.get(txn.accountCode) || 0) + 1);
}
console.log('Transactions by account:');
for (const [code, count] of Array.from(bySection.entries()).sort()) {
  console.log(`  ${code}: ${count} transactions`);
}
console.log('');

console.log('Parsing expected P&L...');
const expected = parseExpectedPnL(expectedPath);
console.log(`Found ${expected.size} accounts in expected P&L\n`);

console.log('Calculating P&L from transactions...');
const calculated = calculatePnL(transactions);
console.log(`Calculated ${calculated.size} accounts\n`);

// Account names for display
const ACCOUNT_NAMES: Record<string, string> = {
  '4000': 'Sales',
  '4010': 'Discounts',
  '4020': 'Refunds',
  '4030': 'Shipping Income',
  '4040': 'Chargebacks',
  '5000': 'Cost of Goods Sold',
  '5010': 'Inbound Freight & Shipping',
  '5030': 'Inventory Adjustment',
  '5040': 'Inventory Shrinkage',
  '5050': 'COGS - Other',
  '6010': 'Outbound Shipping & Delivery',
  '6020': '3PL Expense',
  '6035': 'Packaging Supplies',
  '6055': 'Amazon Seller Fees',
  '6065': 'Shopify Merchant Fees',
  '6070': 'Shopify Selling Apps',
  '6075': 'Other Merchant Processing Fees',
  '6100': 'Advertising & Marketing',
  '6110': 'Paid Advertising',
  '6120': 'Affiliate Marketing Expense',
  '6125': 'Affiliate Recruitment',
  '6130': 'Marketing Contractors',
  '6140': 'Advertising Software & Apps',
  '6150': 'Other Adv & Marketing',
  '6210': 'Bank Charges & Fees',
  '6240': 'Contractors',
  '6250': 'Dues & Subscriptions',
  '6260': 'Education & Training',
  '6290': 'Insurance',
  '6300': 'Legal & Professional Services',
  '6320': 'Professional Expenses',
  '6330': 'Accounting Prof Services',
  '6340': 'Meals & Entertainment',
  '6360': 'Other General & Admin',
  '6375': 'Software & Apps',
  '6390': 'Product Development',
  '6410': 'Rent & Lease',
  '6450': 'Taxes & Licenses',
  '6470': 'Travel',
  '6495': 'Discretionary Spending',
  '7000': 'Interest Income',
};

const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
                '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];

// Compare and show differences
console.log('='.repeat(120));
console.log('COMPARISON: Expected vs Calculated');
console.log('='.repeat(120));

const allAccounts = new Set([...expected.keys(), ...calculated.keys()]);
const sortedAccounts = Array.from(allAccounts).sort();

let totalDiff = 0;
const diffsByAccount: { account: string; name: string; diff: number; details: string[] }[] = [];

for (const accountCode of sortedAccounts) {
  const expectedMap = expected.get(accountCode) || new Map();
  const calculatedMap = calculated.get(accountCode) || new Map();

  let accountDiff = 0;
  const monthDiffs: string[] = [];

  for (const month of months) {
    const exp = expectedMap.get(month) || 0;
    const calc = calculatedMap.get(month) || 0;
    const diff = calc - exp;

    if (Math.abs(diff) > 0.01) {
      accountDiff += diff;
      monthDiffs.push(`  ${MONTH_NAMES[month]}: Expected ${fmt(exp)}, Got ${fmt(calc)}, Diff: ${fmt(diff)}`);
    }
  }

  if (Math.abs(accountDiff) > 0.01) {
    totalDiff += accountDiff;
    diffsByAccount.push({
      account: accountCode,
      name: ACCOUNT_NAMES[accountCode] || 'Unknown',
      diff: accountDiff,
      details: monthDiffs
    });
  }
}

// Sort by absolute difference
diffsByAccount.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

if (diffsByAccount.length === 0) {
  console.log('\n*** PERFECT MATCH! All accounts match expected P&L ***\n');
} else {
  for (const { account, name, diff, details } of diffsByAccount) {
    console.log(`\n${account} ${name}: Total Diff = ${fmt(diff)}`);
    for (const detail of details) {
      console.log(detail);
    }
  }
}

console.log('\n' + '='.repeat(120));
console.log(`TOTAL DIFFERENCE: ${fmt(totalDiff)}`);
console.log('='.repeat(120));

// Show YTD comparison
console.log('\n\nYTD COMPARISON BY ACCOUNT:');
console.log('='.repeat(100));
console.log('Account'.padEnd(40) + 'Expected'.padStart(15) + 'Calculated'.padStart(15) + 'Diff'.padStart(15) + 'Match?'.padStart(10));
console.log('-'.repeat(100));

for (const accountCode of sortedAccounts) {
  const expectedMap = expected.get(accountCode) || new Map();
  const calculatedMap = calculated.get(accountCode) || new Map();

  let expYtd = 0, calcYtd = 0;
  for (const month of months) {
    expYtd += expectedMap.get(month) || 0;
    calcYtd += calculatedMap.get(month) || 0;
  }

  const diff = calcYtd - expYtd;
  const match = Math.abs(diff) < 0.01 ? 'YES' : 'NO';
  const name = ACCOUNT_NAMES[accountCode] || 'Unknown';

  console.log(
    `${accountCode} ${name}`.padEnd(40) +
    fmt(expYtd).padStart(15) +
    fmt(calcYtd).padStart(15) +
    fmt(diff).padStart(15) +
    match.padStart(10)
  );
}
