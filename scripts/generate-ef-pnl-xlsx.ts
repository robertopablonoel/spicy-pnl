/**
 * Generate Empire Flippers P&L as Excel file with formulas
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

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

// Months to include (only Dec 2024 onwards - when we have data)
const allMonths: string[] = [];
// Dec 2024
allMonths.push('2024-12');
// All of 2025
for (let month = 1; month <= 12; month++) {
  allMonths.push(`2025-${month.toString().padStart(2, '0')}`);
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

// ============ Calculate Line Items ============

// REVENUE
const grossSales = sumAccounts(['4000']);
const shippingIncome = sumAccounts(['4030']);
const discounts = sumAccounts(['4010']);
const refunds = sumAccounts(['4020']);
const chargebacks = sumAccounts(['4040']);

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

// OPERATING EXPENSES
const chargebacksExp: Record<string, number> = {};
allMonths.forEach(m => { chargebacksExp[m] = Math.abs(chargebacks[m] || 0); });

const affiliatePayouts = sumAccounts(['6120', '6125']);
const contractors = sumAccounts(['6240']);
const software = sumAccounts(['6070', '6140', '6375']);
const marketingAgencies = sumAccounts(['6130']);
const accounting = sumAccounts(['6330']);
const otherExpenses = sumAccounts(['6100', '6150', '6210', '6250', '6260', '6290', '6300', '6320', '6390', '6410', '6450', '6470', '6495']);

// ADD BACKS
const allAddBackAccounts = ['5000', '5010', '5030', '5040', '5050', '6010', '6020', '6035', '6055', '6065', '6070', '6075', '6100', '6110', '6120', '6125', '6130', '6140', '6150', '6210', '6240', '6250', '6260', '6290', '6300', '6320', '6330', '6375', '6390', '6410', '6450', '6470', '6495'];
const totalAddBacks = sumAddBacks(allAddBackAccounts);

// ============ Generate Excel ============

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('P&L Statement');

  // Column setup matching EF format:
  // A = Notes (narrow), B = Category (~40), C onwards = months (~9), then totals
  // Months: C through O (13 months), P = 2024 Total, Q = 2025 Total, R = TTM Total
  const monthCols = allMonths.map((_, i) => String.fromCharCode(67 + i)); // C through O
  const col2024 = 'P';
  const col2025 = 'Q';
  const colTTM = 'R';

  // TTM months are Dec-24 through Nov-25 (columns C through N)
  const ttmStartCol = 'C';  // Dec-24
  const ttmEndCol = 'N';    // Nov-25

  // Set column widths to match EF format
  sheet.getColumn('A').width = 20;   // Notes column
  sheet.getColumn('B').width = 32;   // Category column
  for (let i = 3; i <= 18; i++) {    // C through R (months + totals)
    sheet.getColumn(i).width = 11;
  }

  // Currency format
  const currencyFormat = '#,##0;(#,##0);""';

  let row = 1;

  // Row 1: Title in column C (like EF format)
  sheet.getCell(`C${row}`).value = 'Profit & Loss Statement (USD)';
  sheet.getCell(`C${row}`).font = { bold: true, size: 12 };
  sheet.mergeCells(`C${row}:R${row}`);
  row++;

  // Row 2: Empty
  row++;

  // Row 3: Headers
  const headerRow = row;
  sheet.getCell(`A${row}`).value = 'NOTES';
  sheet.getCell(`A${row}`).font = { bold: true, size: 10 };
  sheet.getCell(`B${row}`).value = '';
  allMonths.forEach((m, i) => {
    const cell = sheet.getCell(`${monthCols[i]}${row}`);
    cell.value = fmtMonth(m);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });
  sheet.getCell(`${col2024}${row}`).value = '2024';
  sheet.getCell(`${col2024}${row}`).font = { bold: true, size: 10 };
  sheet.getCell(`${col2024}${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`${col2025}${row}`).value = '2025';
  sheet.getCell(`${col2025}${row}`).font = { bold: true, size: 10 };
  sheet.getCell(`${col2025}${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`${colTTM}${row}`).value = 'TTM';
  sheet.getCell(`${colTTM}${row}`).font = { bold: true, size: 10 };
  sheet.getCell(`${colTTM}${row}`).alignment = { horizontal: 'center' };
  row++;

  // Row 4: Empty
  row++;

  // Helper to add a data row with values
  function addDataRow(label: string, data: Record<string, number>, indent = false): number {
    const currentRow = row;
    sheet.getCell(`B${row}`).value = label;

    allMonths.forEach((m, i) => {
      const cell = sheet.getCell(`${monthCols[i]}${row}`);
      cell.value = data[m] || null;
      cell.numFmt = currencyFormat;
    });

    // 2024 Total formula (C only = Dec-24)
    sheet.getCell(`${col2024}${row}`).value = { formula: `C${row}` };
    sheet.getCell(`${col2024}${row}`).numFmt = currencyFormat;

    // 2025 Total formula (D through O = Jan-25 to Dec-25)
    sheet.getCell(`${col2025}${row}`).value = { formula: `SUM(D${row}:O${row})` };
    sheet.getCell(`${col2025}${row}`).numFmt = currencyFormat;

    // TTM formula (C through N = Dec-24 through Nov-25)
    sheet.getCell(`${colTTM}${row}`).value = { formula: `SUM(${ttmStartCol}${row}:${ttmEndCol}${row})` };
    sheet.getCell(`${colTTM}${row}`).numFmt = currencyFormat;

    row++;
    return currentRow;
  }

  // Helper to add a formula row (sum of other rows) - for totals
  function addFormulaRow(label: string, sourceRows: number[], isTotal = false): number {
    const currentRow = row;
    sheet.getCell(`B${row}`).value = label;
    if (isTotal) {
      sheet.getCell(`B${row}`).font = { bold: true, size: 10 };
    }

    allMonths.forEach((_, i) => {
      const col = monthCols[i];
      const formula = sourceRows.map(r => `${col}${r}`).join('+');
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = { formula };
      cell.numFmt = currencyFormat;
      if (isTotal) cell.font = { bold: true, size: 10 };
    });

    // Totals columns
    [col2024, col2025, colTTM].forEach(col => {
      const formula = sourceRows.map(r => `${col}${r}`).join('+');
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = { formula };
      cell.numFmt = currencyFormat;
      if (isTotal) cell.font = { bold: true, size: 10 };
    });

    row++;
    return currentRow;
  }

  // Helper to add subtraction formula row
  function addSubtractionRow(label: string, minuendRow: number, subtrahendRows: number[], isTotal = false): number {
    const currentRow = row;
    sheet.getCell(`B${row}`).value = label;
    if (isTotal) {
      sheet.getCell(`B${row}`).font = { bold: true, size: 10 };
    }

    allMonths.forEach((_, i) => {
      const col = monthCols[i];
      const subtrahends = subtrahendRows.map(r => `${col}${r}`).join('+');
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = { formula: `${col}${minuendRow}-(${subtrahends})` };
      cell.numFmt = currencyFormat;
      if (isTotal) cell.font = { bold: true, size: 10 };
    });

    [col2024, col2025, colTTM].forEach(col => {
      const subtrahends = subtrahendRows.map(r => `${col}${r}`).join('+');
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = { formula: `${col}${minuendRow}-(${subtrahends})` };
      cell.numFmt = currencyFormat;
      if (isTotal) cell.font = { bold: true, size: 10 };
    });

    row++;
    return currentRow;
  }

  // Helper to add section header
  function addSectionHeader(label: string): void {
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`B${row}`).font = { bold: true, size: 10 };
    row++;
  }

  // Helper to add empty row
  function addEmptyRow(): void {
    row++;
  }

  // REVENUE Section
  addSectionHeader('Revenue');
  const grossSalesRow = addDataRow('Gross Sales', grossSales);
  const shippingIncomeRow = addDataRow('Shipping Income', shippingIncome);
  const discountsRow = addDataRow('Discounts', discounts);
  const refundsRow = addDataRow('Refunds', refunds);
  const totalRevenueRow = addFormulaRow('TOTAL REVENUE', [grossSalesRow, shippingIncomeRow, discountsRow, refundsRow], true);
  addEmptyRow();

  // COST OF SALES Section
  addSectionHeader('Cost Of Sales');
  const googleAdsRow = addDataRow('Paid Traffic - Google Ads', googleAds);
  const facebookAdsRow = addDataRow('Paid Traffic - Facebook Ads', facebookAds);
  const otherAdsRow = addDataRow('Paid Traffic - Other', otherAds);
  const cogsRow = addDataRow('Cost of Goods Sold (COGS)', cogs);
  const processingFeesRow = addDataRow('Processing Fees', processingFees);
  const shippingRow = addDataRow('Shipping and Delivery', shipping);
  const totalCOSRow = addFormulaRow('Total Cost Of Sales', [googleAdsRow, facebookAdsRow, otherAdsRow, cogsRow, processingFeesRow, shippingRow], true);
  addEmptyRow();

  // GROSS PROFIT
  const grossProfitRow = addSubtractionRow('GROSS PROFIT', totalRevenueRow, [totalCOSRow], true);
  addEmptyRow();

  // OPERATING EXPENSES Section
  addSectionHeader('Operating Expenses');
  const chargebacksExpRow = addDataRow('Chargebacks', chargebacksExp);
  const affiliatePayoutsRow = addDataRow('Affiliate Program (Payouts)', affiliatePayouts);
  const contractorsRow = addDataRow('Contractors', contractors);
  const softwareRow = addDataRow('Software', software);
  const marketingAgenciesRow = addDataRow('Marketing Agencies', marketingAgencies);
  const accountingRow = addDataRow('Accounting', accounting);
  const otherExpensesRow = addDataRow('Other', otherExpenses);
  const totalOpExRow = addFormulaRow('Total Operating Expenses', [chargebacksExpRow, affiliatePayoutsRow, contractorsRow, softwareRow, marketingAgenciesRow, accountingRow, otherExpensesRow], true);
  addEmptyRow();

  // TOTAL EXPENSES
  const totalExpensesRow = addFormulaRow('TOTAL EXPENSES', [totalCOSRow, totalOpExRow], true);
  addEmptyRow();

  // ADD BACKS Section
  addSectionHeader('Add Backs (Discretionary Expenses)');
  const addBacksRow = addDataRow('Total Add Back Expenses', totalAddBacks);
  addEmptyRow();

  // EXPENSES AFTER ADD BACKS
  const expensesAfterAddBacksRow = addSubtractionRow('EXPENSES AFTER ADD BACKS', totalExpensesRow, [addBacksRow], true);
  addEmptyRow();

  // NET INCOME
  const netIncomeRow = addSubtractionRow('NET INCOME', totalRevenueRow, [expensesAfterAddBacksRow], true);

  // Freeze panes - freeze columns A+B and header row
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: headerRow }];

  // Save
  const outputPath = path.join(__dirname, '../public/pnl-clean.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  // Summary - TTM is Dec-24 through Nov-25 (first 12 months in our array)
  const ttmMonthsArr = allMonths.slice(0, 12);
  const ttmRevenue = ttmMonthsArr.reduce((sum, m) => sum + (grossSales[m] + shippingIncome[m] + discounts[m] + refunds[m]), 0);
  const ttmNetIncome = ttmMonthsArr.reduce((sum, m) => {
    const rev = grossSales[m] + shippingIncome[m] + discounts[m] + refunds[m];
    const cos = googleAds[m] + facebookAds[m] + otherAds[m] + cogs[m] + processingFees[m] + shipping[m];
    const opex = chargebacksExp[m] + affiliatePayouts[m] + contractors[m] + software[m] + marketingAgencies[m] + accounting[m] + otherExpenses[m];
    const addbacks = totalAddBacks[m];
    return sum + (rev - (cos + opex - addbacks));
  }, 0);

  console.log('='.repeat(50));
  console.log('EXCEL P&L GENERATED: public/pnl-clean.xlsx');
  console.log('='.repeat(50));
  console.log('');
  console.log('Features:');
  console.log('  - All totals use Excel formulas');
  console.log('  - 2024 Total, 2025 Total, TTM Total columns');
  console.log('  - Frozen header row and category column');
  console.log('  - Currency formatting');
  console.log('');
  console.log(`TTM Net Income: $${Math.round(ttmNetIncome).toLocaleString()}`);
  console.log(`Output: ${outputPath}`);
}

generateExcel().catch(console.error);
