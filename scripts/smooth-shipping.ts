/**
 * Smooth 3PL and Shipping costs pro-rata based on revenue
 *
 * RATIONALE: 3PL and shipping costs are often paid in lump sums or irregularly,
 * but they should be matched to the revenue they supported. This script spreads
 * Jan-Sep shipping/3PL costs across those months proportionally to each month's revenue.
 *
 * Accounts affected:
 * - 6010 Outbound Shipping
 * - 6020 3PL Fulfillment
 * - 6035 Packaging Supplies
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../private/all-txn.csv');
const outputPath = path.join(__dirname, '../private/all-txn.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

// Parse CSV line handling quoted fields with commas
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

// Accounts to smooth
const SHIPPING_ACCOUNTS = ['6010', '6020', '6035'];

// Months to smooth (Dec 2024 + Jan-Sep 2025)
// Format: { month, year }
const SMOOTH_MONTHS = [
  { month: '12', year: '2024' },
  { month: '01', year: '2025' },
  { month: '02', year: '2025' },
  { month: '03', year: '2025' },
  { month: '04', year: '2025' },
  { month: '05', year: '2025' },
  { month: '06', year: '2025' },
  { month: '07', year: '2025' },
  { month: '08', year: '2025' },
  { month: '09', year: '2025' },
];

interface Transaction {
  lineNum: number;
  line: string;
  date: string;
  monthKey: string; // "MM/YYYY" format
  amount: number;
  section: string;
  sectionCode: string;
}

// Helper to create month key
function monthKey(month: string, year: string): string {
  return `${month}/${year}`;
}

// First pass: collect all transactions and calculate monthly revenue
let currentSection = '';
let currentCode = '';

const allTransactions: Transaction[] = [];
const revenueByMonth: Record<string, number> = {};
const shippingByMonth: Record<string, number> = {};
const shippingTransactions: Transaction[] = [];

// Initialize months
for (const m of SMOOTH_MONTHS) {
  const key = monthKey(m.month, m.year);
  revenueByMonth[key] = 0;
  shippingByMonth[key] = 0;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check for section header
  const sectionMatch = trimmed.match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentCode = codeMatch ? codeMatch[1] : '';
    continue;
  }

  // Check if it's a transaction
  const dateMatch = line.match(/^,(\d{2})\/\d{2}\/(\d{4}),/);
  if (!dateMatch) continue;

  const month = dateMatch[1];
  const year = dateMatch[2];

  // Check if this month/year combo is in our smoothing range
  const isInSmoothRange = SMOOTH_MONTHS.some(m => m.month === month && m.year === year);
  if (!isInSmoothRange) continue;

  const key = monthKey(month, year);

  // Extract amount (column 9, index 8) - use proper CSV parsing for quoted fields
  const parts = parseCSVLine(line);
  const amountStr = parts[8]?.replace(/[$,]/g, '') || '0';
  const amount = parseFloat(amountStr) || 0;

  const txn: Transaction = {
    lineNum: i,
    line,
    date: dateMatch[0],
    monthKey: key,
    amount,
    section: currentSection,
    sectionCode: currentCode
  };

  allTransactions.push(txn);

  // Track revenue (4xxx accounts) - use absolute value since revenue is positive
  if (currentCode.startsWith('4')) {
    revenueByMonth[key] += Math.abs(amount);
  }

  // Track shipping transactions
  if (SHIPPING_ACCOUNTS.includes(currentCode)) {
    shippingByMonth[key] += amount;
    shippingTransactions.push(txn);
  }
}

// Calculate total shipping and total revenue for smoothing period
let totalShipping = 0;
let totalRevenue = 0;

for (const m of SMOOTH_MONTHS) {
  const key = monthKey(m.month, m.year);
  totalShipping += shippingByMonth[key];
  totalRevenue += revenueByMonth[key];
}

console.log('='.repeat(100));
console.log('SHIPPING SMOOTHING - PRO-RATA BY REVENUE');
console.log('='.repeat(100));
console.log('\n### BEFORE SMOOTHING:\n');
console.log('Month       Revenue          Shipping        Ship % of Rev');
console.log('-'.repeat(65));

for (const m of SMOOTH_MONTHS) {
  const key = monthKey(m.month, m.year);
  const shipPct = revenueByMonth[key] > 0 ? (shippingByMonth[key] / revenueByMonth[key] * 100) : 0;
  console.log(
    `${m.month}/${m.year}   $${revenueByMonth[key].toFixed(0).padStart(12)}   $${shippingByMonth[key].toFixed(0).padStart(10)}   ${shipPct.toFixed(1)}%`
  );
}
console.log('-'.repeat(65));
console.log(`TOTAL       $${totalRevenue.toFixed(0).padStart(12)}   $${totalShipping.toFixed(0).padStart(10)}`);

// Calculate pro-rata shipping by month
const proRataShipping: Record<string, number> = {};
for (const m of SMOOTH_MONTHS) {
  const key = monthKey(m.month, m.year);
  const revenuePct = totalRevenue > 0 ? revenueByMonth[key] / totalRevenue : 1 / SMOOTH_MONTHS.length;
  proRataShipping[key] = totalShipping * revenuePct;
}

console.log('\n### AFTER SMOOTHING (Pro-rata by revenue):\n');
console.log('Month       Revenue          Shipping        Ship % of Rev   Adjustment');
console.log('-'.repeat(85));

for (const m of SMOOTH_MONTHS) {
  const key = monthKey(m.month, m.year);
  const shipPct = revenueByMonth[key] > 0 ? (proRataShipping[key] / revenueByMonth[key] * 100) : 0;
  const adjustment = proRataShipping[key] - shippingByMonth[key];
  const adjSign = adjustment >= 0 ? '+' : '';
  console.log(
    `${m.month}/${m.year}   $${revenueByMonth[key].toFixed(0).padStart(12)}   $${proRataShipping[key].toFixed(0).padStart(10)}   ${shipPct.toFixed(1)}%          ${adjSign}$${adjustment.toFixed(0)}`
  );
}

// Now we need to modify the CSV
// Strategy: Remove all shipping transactions from smoothing period and add new smoothed ones

// Track lines to remove (shipping transactions in smoothing period)
const linesToRemove = new Set<number>();
for (const txn of shippingTransactions) {
  linesToRemove.add(txn.lineNum);
}

// Build new lines
const newLines: string[] = [];
let addedSmoothedTransactions = false;

for (let i = 0; i < lines.length; i++) {
  // Skip removed shipping transactions
  if (linesToRemove.has(i)) {
    continue;
  }

  const line = lines[i];
  newLines.push(line);

  // After the 6010 section header, add smoothed transactions
  if (!addedSmoothedTransactions && line.trim().match(/^6010\s/)) {
    addedSmoothedTransactions = true;

    // Add one transaction per month with the smoothed amount
    for (const m of SMOOTH_MONTHS) {
      const key = monthKey(m.month, m.year);
      // Use middle of month as date
      const date = `${m.month}/15/${m.year}`;
      const amount = proRataShipping[key];

      // Format: ,date,type,num,name,class,memo,account,amount,balance
      // Note: amounts should be positive for expenses in this report format
      const smoothedLine = `,${date},Journal Entry,,,,"Smoothed shipping expense (pro-rata allocation)",6010 Outbound Shipping,${Math.abs(amount).toFixed(2)},`;
      newLines.push(smoothedLine);
    }
  }
}

// Write output
fs.writeFileSync(outputPath, newLines.join('\n'));

console.log(`\n${'='.repeat(100)}`);
console.log(`Removed ${linesToRemove.size} original shipping transactions`);
console.log(`Added ${SMOOTH_MONTHS.length} smoothed transactions to 6010`);
console.log(`Output written to: ${outputPath}`);
