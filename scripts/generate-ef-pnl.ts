/**
 * Generate Empire Flippers P&L from QuickBooks data
 * Outputs CSV in their required format
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

// ============ Main ============

const csvPath = path.join(__dirname, '../public/all-txn.csv');
const exclusionsPath = path.join(__dirname, '../public/exclusions.csv');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const exclusionsContent = fs.readFileSync(exclusionsPath, 'utf-8');

const { transactions: allTransactions } = parseCSV(csvContent);
const exclusions = parseExclusionsCSV(exclusionsContent);
const tags = matchExclusionsToTransactions(exclusions, allTransactions);

// For EF format: use ALL transactions (not filtered)
// Add-backs will be shown separately and deducted from expenses
const transactions = allTransactions;

// All months in EF template (Jan 2022 - Dec 2025)
const efMonths: string[] = [];
for (let year = 2022; year <= 2025; year++) {
  for (let month = 1; month <= 12; month++) {
    efMonths.push(`${year}-${month.toString().padStart(2, '0')}`);
  }
}

// Helper to calculate amounts for accounts
function calcAmounts(
  accountCodes: string[],
  filter?: (t: Transaction) => boolean
): Record<string, number> {
  const monthly: Record<string, number> = {};
  efMonths.forEach(m => { monthly[m] = 0; });

  for (const txn of transactions) {
    if (accountCodes.includes(txn.accountCode)) {
      if (!filter || filter(txn)) {
        if (monthly[txn.month] !== undefined) {
          monthly[txn.month] += txn.amount;
        }
      }
    }
  }

  return monthly;
}

// Helper to sum by year
function yearTotal(monthly: Record<string, number>, year: number): number {
  return efMonths
    .filter(m => m.startsWith(`${year}-`))
    .reduce((sum, m) => sum + (monthly[m] || 0), 0);
}

// Format currency for CSV
function fmt(n: number): string {
  if (n === 0) return ' $ -   ';
  const abs = Math.abs(n);
  const formatted = ' $ ' + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ';
  return n < 0 ? `(${formatted.trim()})` : formatted;
}

// ============ Calculate Line Items ============

// REVENUE
const grossSales = calcAmounts(['4000']);
const discounts = calcAmounts(['4010']);
const returns = calcAmounts(['4020']);
const shippingIncome = calcAmounts(['4030']);
const chargebacksRevenue = calcAmounts(['4040']); // Will move to expenses

// Total Revenue (without chargebacks - they go to expenses)
const totalRevenue: Record<string, number> = {};
efMonths.forEach(m => {
  totalRevenue[m] = (grossSales[m] || 0) + (discounts[m] || 0) + (returns[m] || 0) + (shippingIncome[m] || 0);
});

// COST OF SALES
const googleAds = calcAmounts(['6110'], t => t.name.toLowerCase().includes('google'));
const facebookAds = calcAmounts(['6110'], t => t.name.toLowerCase().includes('facebook') || t.name.toLowerCase().includes('facebk'));
const otherAds = calcAmounts(['6110'], t =>
  !t.name.toLowerCase().includes('google') &&
  !t.name.toLowerCase().includes('facebook') &&
  !t.name.toLowerCase().includes('facebk')
);
const cogs = calcAmounts(['5000', '5030', '5040', '5050']);
const processingFees = calcAmounts(['6055', '6065', '6075']);
const shippingDelivery = calcAmounts(['5010', '6010', '6020', '6035']);

// Total Cost of Sales
const totalCostOfSales: Record<string, number> = {};
efMonths.forEach(m => {
  totalCostOfSales[m] = (googleAds[m] || 0) + (facebookAds[m] || 0) + (otherAds[m] || 0) +
    (cogs[m] || 0) + (processingFees[m] || 0) + (shippingDelivery[m] || 0);
});

// GROSS PROFIT
const grossProfit: Record<string, number> = {};
efMonths.forEach(m => {
  grossProfit[m] = (totalRevenue[m] || 0) - (totalCostOfSales[m] || 0);
});

// OPERATING EXPENSES
// Chargebacks are negative in 4040 (contra-revenue), but should be positive expense
const chargebacks: Record<string, number> = {};
efMonths.forEach(m => { chargebacks[m] = Math.abs(chargebacksRevenue[m] || 0); });
const contractors = calcAmounts(['6240']);
const software = calcAmounts(['6070', '6140', '6375']);
const affiliatePayouts = calcAmounts(['6120', '6125']);
const marketingAgencies = calcAmounts(['6130']);
const accounting = calcAmounts(['6330']);
const otherExpenses = calcAmounts(['6100', '6150', '6210', '6250', '6260', '6290', '6300', '6320', '6390', '6410', '6450', '6470', '6495']);

// Total Operating Expenses
const totalOpEx: Record<string, number> = {};
efMonths.forEach(m => {
  totalOpEx[m] = (chargebacks[m] || 0) + (contractors[m] || 0) + (software[m] || 0) +
    (affiliatePayouts[m] || 0) + (marketingAgencies[m] || 0) + (accounting[m] || 0) + (otherExpenses[m] || 0);
});

// TOTAL EXPENSES
const totalExpenses: Record<string, number> = {};
efMonths.forEach(m => {
  totalExpenses[m] = (totalCostOfSales[m] || 0) + (totalOpEx[m] || 0);
});

// ADD BACKS (from exclusions)
const addBacksByCategory: Record<string, Record<string, number>> = {};
const taggedTxns = allTransactions.filter(t => tags[t.id]);
for (const txn of taggedTxns) {
  const tag = tags[txn.id];
  if (!addBacksByCategory[tag.subAccount]) {
    addBacksByCategory[tag.subAccount] = {};
    efMonths.forEach(m => { addBacksByCategory[tag.subAccount][m] = 0; });
  }
  if (addBacksByCategory[tag.subAccount][txn.month] !== undefined) {
    addBacksByCategory[tag.subAccount][txn.month] += txn.amount;
  }
}

// Total Add Backs
const totalAddBacks: Record<string, number> = {};
efMonths.forEach(m => {
  totalAddBacks[m] = Object.values(addBacksByCategory).reduce((sum, cat) => sum + (cat[m] || 0), 0);
});

// EXPENSES AFTER ADD BACKS
const expensesAfterAddBacks: Record<string, number> = {};
efMonths.forEach(m => {
  expensesAfterAddBacks[m] = (totalExpenses[m] || 0) - (totalAddBacks[m] || 0);
});

// NET INCOME (Revenue - Expenses After Add Backs)
const netIncome: Record<string, number> = {};
efMonths.forEach(m => {
  netIncome[m] = (totalRevenue[m] || 0) - (expensesAfterAddBacks[m] || 0);
});

// ============ Generate CSV ============

function generateRow(
  notes: string,
  label: string,
  monthly: Record<string, number>
): string {
  const values = efMonths.map(m => fmt(monthly[m] || 0));
  const yearTotals = [2022, 2023, 2024, 2025].map(y => fmt(yearTotal(monthly, y)));
  return `${notes ? `"${notes}"` : ''},${label},${values.join(',')},,${ yearTotals.join(',')}`;
}

function emptyRow(): string {
  return ',,'.padEnd(efMonths.length + 6, ',');
}

const addBackCategories = Object.keys(addBacksByCategory).slice(0, 5); // Max 5 add-back lines

const outputLines: string[] = [
  // Header
  ',,Profit & Loss Statement (Currency: USD)' + ','.repeat(50),
  emptyRow(),
  // Column headers
  'NOTES,,' + efMonths.map(m => {
    const [year, month] = m.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]}-${year.slice(2)}`;
  }).join(',') + ',,2022 Totals,2023 Totals,2024 Totals,2025 Totals',
  emptyRow(),
  emptyRow(),
  // Revenue section
  '"List each income stream separately",Revenue' + ','.repeat(52),
  generateRow('', 'Gross Sales', grossSales),
  generateRow('', 'Discounts', discounts),
  generateRow('', 'Returns', returns),
  generateRow('', 'Shipping (Credits charged to Customers)', shippingIncome),
  generateRow('', 'Additional Revenue', {}), // Empty
  generateRow('', 'Display Advertising Revenue', {}), // Empty
  generateRow('', 'Affiliate Income', {}), // Empty
  generateRow('', 'TOTAL REVENUE', totalRevenue),
  emptyRow(),
  // Cost of Sales section
  ',Cost Of Sales' + ','.repeat(52),
  generateRow('', 'Paid Traffic - Google Ads', googleAds),
  generateRow('', 'Paid Traffic - Facebook Ads', facebookAds),
  generateRow('', 'Paid Traffic - Other', otherAds),
  generateRow('', 'Cost of Goods Sold (COGS)', cogs),
  generateRow('', 'Credit Card Processing Fees', processingFees),
  generateRow('', 'PayPal Processing Fees', {}), // Empty - included in processing fees
  generateRow('', 'Shipping and Delivery (paid by Merchant)', shippingDelivery),
  generateRow('', 'Total Cost Of Sales', totalCostOfSales),
  emptyRow(),
  generateRow('', 'GROSS PROFIT', grossProfit),
  emptyRow(),
  // Operating Expenses section
  ',Operating Expenses' + ','.repeat(52),
  generateRow('', 'Chargebacks', chargebacks),
  generateRow('', 'Hosting', {}), // Empty
  generateRow('', 'Domains', {}), // Empty
  generateRow('', 'Contractors', contractors),
  generateRow('', 'Software', software),
  generateRow('', 'SEO', {}), // Empty
  generateRow('', 'Content', {}), // Empty
  generateRow('', 'Web Design and Programming Expense', {}), // Empty
  generateRow('', 'Affiliate Program (Payout)', affiliatePayouts),
  generateRow('', 'Marketing Agencies', marketingAgencies),
  generateRow('', 'Accounting', accounting),
  generateRow('', 'Other', otherExpenses),
  generateRow('', 'Total Operating Expenses', totalOpEx),
  emptyRow(),
  generateRow('', 'TOTAL EXPENSES', totalExpenses),
  emptyRow(),
  // Add Backs section
  '," Add Backs (Discretionary Spending, not required) "' + ','.repeat(52),
];

// Add up to 5 add-back categories
for (let i = 0; i < 5; i++) {
  const category = addBackCategories[i];
  if (category) {
    outputLines.push(generateRow('', ` ${category} `, addBacksByCategory[category]));
  } else {
    outputLines.push(generateRow('', ` Discretionary Spending #${i + 1} `, {}));
  }
}

outputLines.push(
  generateRow('', ' Total Add Back Expenses ', totalAddBacks),
  emptyRow(),
  generateRow('', ' EXPENSES AFTER ADD BACKS ', expensesAfterAddBacks),
  emptyRow(),
  generateRow('', 'NET INCOME', netIncome),
  emptyRow(),
  // Traffic section (empty - ignore GA)
  ',TRAFFIC - GA-UA' + ','.repeat(52),
  ', Pageviews ,' + '0,'.repeat(efMonths.length) + ',0,0,0,0',
  ', Users ,' + '0,'.repeat(efMonths.length) + ',0,0,0,0',
  emptyRow(),
  ',TRAFFIC - GA-V4' + ','.repeat(52),
  ', Pageviews ,' + '0,'.repeat(efMonths.length) + ',0,0,0,0',
  ', Users ,' + '0,'.repeat(efMonths.length) + ',0,0,0,0',
  emptyRow(),
  // Inventory
  ',Estimated Inventory Value' + ','.repeat(52),
  emptyRow(),
  ',Date Last Updated' + ','.repeat(52),
);

const outputPath = path.join(__dirname, '../public/empire-flippers-pnl-filled.csv');
fs.writeFileSync(outputPath, outputLines.join('\n'));

// Print summary
console.log('\n' + '='.repeat(60));
console.log('EMPIRE FLIPPERS P&L GENERATED');
console.log('='.repeat(60));

console.log('\nTTM Summary (Dec 2024 - Nov 2025):');
const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
const ttmRevenue = ttmMonths.reduce((s, m) => s + (totalRevenue[m] || 0), 0);
const ttmGrossProfit = ttmMonths.reduce((s, m) => s + (grossProfit[m] || 0), 0);
const ttmNetIncome = ttmMonths.reduce((s, m) => s + (netIncome[m] || 0), 0);
const ttmAddBacks = ttmMonths.reduce((s, m) => s + (totalAddBacks[m] || 0), 0);

console.log(`  Revenue:      $${Math.round(ttmRevenue).toLocaleString()}`);
console.log(`  Gross Profit: $${Math.round(ttmGrossProfit).toLocaleString()} (${(ttmGrossProfit/ttmRevenue*100).toFixed(1)}% margin)`);
console.log(`  Add Backs:    $${Math.round(ttmAddBacks).toLocaleString()}`);
console.log(`  Net Income:   $${Math.round(ttmNetIncome).toLocaleString()} (${(ttmNetIncome/ttmRevenue*100).toFixed(1)}% margin)`);

console.log('\nAdd-back categories included:');
addBackCategories.forEach(cat => {
  const total = ttmMonths.reduce((s, m) => s + (addBacksByCategory[cat][m] || 0), 0);
  console.log(`  - ${cat}: $${Math.round(total).toLocaleString()}`);
});

console.log(`\nOutput: ${outputPath}`);
