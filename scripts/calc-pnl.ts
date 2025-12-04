import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.join(__dirname, '../public/all-txn.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

// Parse CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

// TTM months
const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];

let currentSection = '';
let currentCode = '';
const totals: Record<string, number> = {};
const monthlyRevenue: Record<string, number> = {};

ttmMonths.forEach(m => { monthlyRevenue[m] = 0; });

for (const line of lines) {
  const trimmed = line.trim();

  // Section header (starts with 4-digit code)
  const sectionMatch = trimmed.match(/^(\d{4})\s/);
  if (sectionMatch) {
    currentCode = sectionMatch[1];
    continue;
  }

  // Transaction
  const dateMatch = line.match(/^,(\d{2})\/\d{2}\/(\d{4}),/);
  if (!dateMatch) continue;

  const month = dateMatch[1];
  const year = dateMatch[2];
  const monthKey = year + '-' + month;

  if (!ttmMonths.includes(monthKey)) continue;

  const parts = parseCSVLine(line);
  const amountStr = parts[8]?.replace(/[$,]/g, '') || '0';
  const amount = parseFloat(amountStr) || 0;

  if (!totals[currentCode]) totals[currentCode] = 0;
  totals[currentCode] += amount;

  // Revenue (4xxx)
  if (currentCode.startsWith('4')) {
    monthlyRevenue[monthKey] += amount;
  }
}

// Calculate totals
const revenue = (totals['4000'] || 0) + (totals['4010'] || 0) + (totals['4020'] || 0) + (totals['4030'] || 0) + (totals['4040'] || 0);
const cogs = totals['5000'] || 0;
const costOfSales = Object.keys(totals).filter(k => k.startsWith('6') && parseInt(k) < 6100).reduce((s, k) => s + totals[k], 0);
const opex = Object.keys(totals).filter(k => k.startsWith('6') && parseInt(k) >= 6100).reduce((s, k) => s + totals[k], 0);
const otherIncome = Object.keys(totals).filter(k => k.startsWith('8')).reduce((s, k) => s + totals[k], 0);

const grossProfit = revenue - cogs - costOfSales;
const netIncome = grossProfit - opex + otherIncome;

console.log('\n=== TTM P&L SUMMARY (Dec 2024 - Nov 2025) ===\n');
console.log('Revenue:        $' + revenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('COGS:           $' + cogs.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('Cost of Sales:  $' + costOfSales.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('Gross Profit:   $' + grossProfit.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('OpEx:           $' + opex.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('Other Income:   $' + otherIncome.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('Net Income:     $' + netIncome.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
console.log('\nGross Margin:   ' + (grossProfit/revenue*100).toFixed(1) + '%');
console.log('Net Margin:     ' + (netIncome/revenue*100).toFixed(1) + '%');

console.log('\n=== MONTHLY REVENUE ===\n');
ttmMonths.forEach(m => {
  console.log(m + ': $' + monthlyRevenue[m].toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}));
});
