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

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const outputPath = path.join(__dirname, '../public/all-txn.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

// Accounts to smooth
const SHIPPING_ACCOUNTS = ['6010', '6020', '6035'];

// Months to smooth (Jan-Sep 2025)
const SMOOTH_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];

interface Transaction {
  lineNum: number;
  line: string;
  date: string;
  month: string;
  amount: number;
  section: string;
  sectionCode: string;
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
  revenueByMonth[m] = 0;
  shippingByMonth[m] = 0;
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

  // Only process 2025 transactions in our target months
  if (year !== '2025' || !SMOOTH_MONTHS.includes(month)) continue;

  // Extract amount (column 9, index 8)
  const parts = line.split(',');
  const amountStr = parts[8]?.replace(/[$",]/g, '') || '0';
  const amount = parseFloat(amountStr) || 0;

  const txn: Transaction = {
    lineNum: i,
    line,
    date: dateMatch[0],
    month,
    amount,
    section: currentSection,
    sectionCode: currentCode
  };

  allTransactions.push(txn);

  // Track revenue (4xxx accounts) - use absolute value since revenue is positive
  if (currentCode.startsWith('4')) {
    revenueByMonth[month] += Math.abs(amount);
  }

  // Track shipping transactions
  if (SHIPPING_ACCOUNTS.includes(currentCode)) {
    shippingByMonth[month] += amount;
    shippingTransactions.push(txn);
  }
}

// Calculate total shipping and total revenue for Jan-Sep
let totalShipping = 0;
let totalRevenue = 0;

for (const m of SMOOTH_MONTHS) {
  totalShipping += shippingByMonth[m];
  totalRevenue += revenueByMonth[m];
}

console.log('='.repeat(100));
console.log('SHIPPING SMOOTHING - PRO-RATA BY REVENUE');
console.log('='.repeat(100));
console.log('\n### BEFORE SMOOTHING:\n');
console.log('Month     Revenue          Shipping        Ship % of Rev');
console.log('-'.repeat(60));

for (const m of SMOOTH_MONTHS) {
  const shipPct = revenueByMonth[m] > 0 ? (shippingByMonth[m] / revenueByMonth[m] * 100) : 0;
  console.log(
    `${m}/2025   $${revenueByMonth[m].toFixed(0).padStart(12)}   $${shippingByMonth[m].toFixed(0).padStart(10)}   ${shipPct.toFixed(1)}%`
  );
}
console.log('-'.repeat(60));
console.log(`TOTAL     $${totalRevenue.toFixed(0).padStart(12)}   $${totalShipping.toFixed(0).padStart(10)}`);

// Calculate pro-rata shipping by month
const proRataShipping: Record<string, number> = {};
for (const m of SMOOTH_MONTHS) {
  const revenuePct = totalRevenue > 0 ? revenueByMonth[m] / totalRevenue : 1 / SMOOTH_MONTHS.length;
  proRataShipping[m] = totalShipping * revenuePct;
}

console.log('\n### AFTER SMOOTHING (Pro-rata by revenue):\n');
console.log('Month     Revenue          Shipping        Ship % of Rev   Adjustment');
console.log('-'.repeat(80));

for (const m of SMOOTH_MONTHS) {
  const shipPct = revenueByMonth[m] > 0 ? (proRataShipping[m] / revenueByMonth[m] * 100) : 0;
  const adjustment = proRataShipping[m] - shippingByMonth[m];
  const adjSign = adjustment >= 0 ? '+' : '';
  console.log(
    `${m}/2025   $${revenueByMonth[m].toFixed(0).padStart(12)}   $${proRataShipping[m].toFixed(0).padStart(10)}   ${shipPct.toFixed(1)}%          ${adjSign}$${adjustment.toFixed(0)}`
  );
}

// Now we need to modify the CSV
// Strategy: Remove all shipping transactions from Jan-Sep and add new smoothed ones

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
      // Use middle of month as date
      const date = `${m}/15/2025`;
      const amount = proRataShipping[m];

      // Format: ,date,type,num,name,class,memo,account,amount,balance
      const smoothedLine = `,${date},Journal Entry,,,,"Smoothed shipping expense (pro-rata allocation)",6010 Outbound Shipping,${(-amount).toFixed(2)},`;
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
