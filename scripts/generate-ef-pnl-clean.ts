/**
 * Generate clean Empire Flippers P&L from QuickBooks data
 * Simple, well-formatted CSV with EF account structure
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ CSV Parser ============

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
  const cleaned = str.replace(/[$,\"]/g, '');
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

function extractSectionCode(sectionHeader: string): string {
  const match = sectionHeader.match(/^(\d{4})/);
  return match ? match[1] : '';
}

function isPnLAccount(code: string): boolean {
  const num = parseInt(code, 10);
  return num >= 4000 && num < 8000;
}

interface Transaction {
  id: string;
  transactionDate: string;
  month: string;
  accountCode: string;
  amount: number;
  name: string;
}

function parseCSV(csvContent: string): Transaction[] {
  const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const transactions: Transaction[] = [];

  let currentSectionCode: string | null = null;
  let txnIndex = 0;

  for (let i = 5; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,,,,,,,') continue;
    if (line.startsWith('Total for')) continue;

    const sectionMatch = line.match(/^([^,]+),,,,,,,,,$/);
    if (sectionMatch) {
      currentSectionCode = extractSectionCode(sectionMatch[1].trim());
      continue;
    }

    if (!currentSectionCode || !isPnLAccount(currentSectionCode)) continue;

    const fields = parseCSVLine(line);
    const dateField = fields[1];
    if (!dateField || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) continue;

    transactions.push({
      id: `txn-${txnIndex++}`,
      transactionDate: dateField,
      month: parseMonth(dateField),
      accountCode: currentSectionCode,
      amount: parseAmount(fields[8]),
      name: fields[4] || ''
    });
  }

  return transactions;
}

// ============ Exclusions ============

interface Exclusion {
  date: string;
  accountCode: string;
  amount: number;
  category: string;
}

function parseExclusions(csvContent: string): Exclusion[] {
  const lines = csvContent.trim().split('\n');
  const exclusions: Exclusion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
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

function matchExclusions(exclusions: Exclusion[], transactions: Transaction[]): Set<string> {
  const tagged = new Set<string>();

  for (const excl of exclusions) {
    const match = transactions.find(t =>
      t.transactionDate === excl.date &&
      Math.abs(t.amount - excl.amount) < 0.01 &&
      t.accountCode === excl.accountCode &&
      !tagged.has(t.id)
    );
    if (match) tagged.add(match.id);
  }

  return tagged;
}

// ============ Main ============

const csvPath = path.join(__dirname, '../public/all-txn.csv');
const exclusionsPath = path.join(__dirname, '../public/exclusions.csv');

const transactions = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
const exclusions = parseExclusions(fs.readFileSync(exclusionsPath, 'utf-8'));
const tagged = matchExclusions(exclusions, transactions);

// Months to include
const allMonths: string[] = [];
for (let year = 2024; year <= 2025; year++) {
  for (let month = 1; month <= 12; month++) {
    allMonths.push(`${year}-${month.toString().padStart(2, '0')}`);
  }
}

// Helper to sum accounts
function sumAccounts(
  accounts: string[],
  filter?: (t: Transaction) => boolean
): Record<string, number> {
  const result: Record<string, number> = {};
  allMonths.forEach(m => result[m] = 0);

  for (const t of transactions) {
    if (accounts.includes(t.accountCode) && result[t.month] !== undefined) {
      if (!filter || filter(t)) {
        result[t.month] += t.amount;
      }
    }
  }
  return result;
}

// Helper for add-backs (from tagged transactions)
function sumAddBacks(accounts: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  allMonths.forEach(m => result[m] = 0);

  for (const t of transactions) {
    if (tagged.has(t.id) && accounts.includes(t.accountCode) && result[t.month] !== undefined) {
      result[t.month] += t.amount;
    }
  }
  return result;
}

// Format month header
function fmtMonth(m: string): string {
  const [year, month] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(month) - 1]}-${year.slice(2)}`;
}

// Format currency for CSV (quoted to handle commas)
function fmt(n: number): string {
  if (Math.abs(n) < 0.01) return '';
  const rounded = Math.round(n);
  if (rounded < 0) return `"(${Math.abs(rounded).toLocaleString()})"`;
  return `"${rounded.toLocaleString()}"`;
}

// Year total
function yearSum(data: Record<string, number>, year: number): number {
  return allMonths
    .filter(m => m.startsWith(`${year}-`))
    .reduce((sum, m) => sum + (data[m] || 0), 0);
}

// TTM total (Dec 2024 - Nov 2025)
const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
function ttmSum(data: Record<string, number>): number {
  return ttmMonths.reduce((sum, m) => sum + (data[m] || 0), 0);
}

// ============ Calculate Line Items ============

// REVENUE
const grossSales = sumAccounts(['4000']);
const shippingIncome = sumAccounts(['4030']);
const discounts = sumAccounts(['4010']);
const refunds = sumAccounts(['4020']);
const chargebacks = sumAccounts(['4040']);

// Note: chargebacks excluded from revenue - they go to OpEx in EF format
const totalRevenue: Record<string, number> = {};
allMonths.forEach(m => {
  totalRevenue[m] = (grossSales[m] || 0) + (shippingIncome[m] || 0) + (discounts[m] || 0) + (refunds[m] || 0);
});

// COST OF SALES
const googleAds = sumAccounts(['6110'], t => t.name.toLowerCase().includes('google'));
const facebookAds = sumAccounts(['6110'], t => t.name.toLowerCase().includes('facebook') || t.name.toLowerCase().includes('facebk'));
const otherAds = sumAccounts(['6110'], t =>
  !t.name.toLowerCase().includes('google') &&
  !t.name.toLowerCase().includes('facebook') &&
  !t.name.toLowerCase().includes('facebk')
);
const cogs = sumAccounts(['5000', '5030', '5040', '5050']);
const processingFees = sumAccounts(['6055', '6065', '6075']);
const shipping = sumAccounts(['5010', '6010', '6020', '6035']);

const totalCOS: Record<string, number> = {};
allMonths.forEach(m => {
  totalCOS[m] = (googleAds[m] || 0) + (facebookAds[m] || 0) + (otherAds[m] || 0) + (cogs[m] || 0) + (processingFees[m] || 0) + (shipping[m] || 0);
});

// GROSS PROFIT
const grossProfit: Record<string, number> = {};
allMonths.forEach(m => {
  grossProfit[m] = (totalRevenue[m] || 0) - (totalCOS[m] || 0);
});

// OPERATING EXPENSES
const chargebacksExp: Record<string, number> = {};
allMonths.forEach(m => { chargebacksExp[m] = Math.abs(chargebacks[m] || 0); });

const affiliatePayouts = sumAccounts(['6120', '6125']);
const contractors = sumAccounts(['6240']);
const software = sumAccounts(['6070', '6140', '6375']);
const marketingAgencies = sumAccounts(['6130']);
const accounting = sumAccounts(['6330']);
const otherExpenses = sumAccounts(['6100', '6150', '6210', '6250', '6260', '6290', '6300', '6320', '6390', '6410', '6450', '6470', '6495']);

const totalOpEx: Record<string, number> = {};
allMonths.forEach(m => {
  totalOpEx[m] = (chargebacksExp[m] || 0) + (affiliatePayouts[m] || 0) + (contractors[m] || 0) +
    (software[m] || 0) + (marketingAgencies[m] || 0) + (accounting[m] || 0) + (otherExpenses[m] || 0);
});

// TOTAL EXPENSES
const totalExpenses: Record<string, number> = {};
allMonths.forEach(m => {
  totalExpenses[m] = (totalCOS[m] || 0) + (totalOpEx[m] || 0);
});

// ADD BACKS
const allAddBackAccounts = ['5000', '5010', '5030', '5040', '5050', '6010', '6020', '6035', '6055', '6065', '6070', '6075', '6100', '6110', '6120', '6125', '6130', '6140', '6150', '6210', '6240', '6250', '6260', '6290', '6300', '6320', '6330', '6375', '6390', '6410', '6450', '6470', '6495'];
const totalAddBacks = sumAddBacks(allAddBackAccounts);

// EXPENSES AFTER ADD BACKS
const expensesAfterAddBacks: Record<string, number> = {};
allMonths.forEach(m => {
  expensesAfterAddBacks[m] = (totalExpenses[m] || 0) - (totalAddBacks[m] || 0);
});

// NET INCOME
const netIncome: Record<string, number> = {};
allMonths.forEach(m => {
  netIncome[m] = (totalRevenue[m] || 0) - (expensesAfterAddBacks[m] || 0);
});

// ============ Generate CSV ============

const headers = ['Category', ...allMonths.map(fmtMonth), '2024 Total', '2025 Total', 'TTM Total'];

function row(label: string, data: Record<string, number>, indent = false): string {
  const prefix = indent ? '  ' : '';
  const values = allMonths.map(m => fmt(data[m] || 0));
  const y2024 = fmt(yearSum(data, 2024));
  const y2025 = fmt(yearSum(data, 2025));
  const ttm = fmt(ttmSum(data));
  return [prefix + label, ...values, y2024, y2025, ttm].join(',');
}

function emptyRow(): string {
  return '';
}

function sectionHeader(label: string): string {
  return label;
}

const lines: string[] = [
  'Profit & Loss Statement (USD)',
  emptyRow(),
  headers.join(','),
  emptyRow(),
  sectionHeader('REVENUE'),
  row('Gross Sales', grossSales, true),
  row('Shipping Income', shippingIncome, true),
  row('Discounts', discounts, true),
  row('Refunds', refunds, true),
  row('TOTAL REVENUE', totalRevenue),
  emptyRow(),
  sectionHeader('COST OF SALES'),
  row('Google Ads', googleAds, true),
  row('Facebook Ads', facebookAds, true),
  row('Other Paid Ads', otherAds, true),
  row('Cost of Goods Sold', cogs, true),
  row('Processing Fees', processingFees, true),
  row('Shipping & Fulfillment', shipping, true),
  row('Total Cost of Sales', totalCOS),
  emptyRow(),
  row('GROSS PROFIT', grossProfit),
  emptyRow(),
  sectionHeader('OPERATING EXPENSES'),
  row('Chargebacks', chargebacksExp, true),
  row('Affiliate / Creator Payouts', affiliatePayouts, true),
  row('Contractors', contractors, true),
  row('Software', software, true),
  row('Marketing Agencies', marketingAgencies, true),
  row('Accounting', accounting, true),
  row('Other Expenses', otherExpenses, true),
  row('Total Operating Expenses', totalOpEx),
  emptyRow(),
  row('TOTAL EXPENSES', totalExpenses),
  emptyRow(),
  sectionHeader('ADD BACKS'),
  row('Total Add Backs', totalAddBacks, true),
  emptyRow(),
  row('EXPENSES AFTER ADD BACKS', expensesAfterAddBacks),
  emptyRow(),
  row('NET INCOME', netIncome),
];

const outputPath = path.join(__dirname, '../public/pnl-clean.csv');
fs.writeFileSync(outputPath, lines.join('\n'));

// Summary
const ttmRevenue = ttmSum(totalRevenue);
const ttmGrossProfit = ttmSum(grossProfit);
const ttmNetIncome = ttmSum(netIncome);
const ttmAddBacks = ttmSum(totalAddBacks);

console.log('='.repeat(50));
console.log('P&L GENERATED: public/pnl-clean.csv');
console.log('='.repeat(50));
console.log('');
console.log('TTM (Dec 2024 - Nov 2025):');
console.log(`  Revenue:      $${Math.round(ttmRevenue).toLocaleString()}`);
console.log(`  Gross Profit: $${Math.round(ttmGrossProfit).toLocaleString()} (${(ttmGrossProfit/ttmRevenue*100).toFixed(1)}%)`);
console.log(`  Add Backs:    $${Math.round(ttmAddBacks).toLocaleString()}`);
console.log(`  Net Income:   $${Math.round(ttmNetIncome).toLocaleString()} (${(ttmNetIncome/ttmRevenue*100).toFixed(1)}%)`);
console.log('');
console.log(`Output: ${outputPath}`);
