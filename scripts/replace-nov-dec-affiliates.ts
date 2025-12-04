/**
 * Replace November and December affiliate payouts with data from nov-dec-payouts.csv
 *
 * RATIONALE: The QuickBooks export has individual affiliate payment transactions,
 * but we have more accurate payout data in nov-dec-payouts.csv that includes
 * proper breakdowns by creator. This script strips all Nov/Dec affiliate transactions
 * and replaces them with consolidated entries from the CSV.
 *
 * This runs BEFORE the affiliate date shift so the dates will be shifted properly.
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const payoutsPath = path.join(__dirname, '../public/nov-dec-payouts.csv');
const outputPath = path.join(__dirname, '../public/all-txn.csv');

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

// Parse amount from string
function parseAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[$,"\s]/g, '');
  return parseFloat(cleaned) || 0;
}

// Read the payouts CSV
const payoutsContent = fs.readFileSync(payoutsPath, 'utf-8');
const payoutsLines = payoutsContent.split('\n');

interface Payout {
  name: string;
  total: number;
  month: string; // '11' or '12'
  year: string;  // '2024' for Dec (shifted to Nov), '2025' for Nov (shifted to Oct)
}

const payouts: Payout[] = [];
let currentMonth = '';
let currentYear = '';

for (const line of payoutsLines) {
  const parts = parseCSVLine(line);

  // Check for month header (11/01/2024 or 12/01/2024)
  const dateMatch = parts[0]?.match(/^(\d{2})\/\d{2}\/(\d{4})$/);
  if (dateMatch) {
    currentMonth = dateMatch[1];
    currentYear = dateMatch[2];
    continue;
  }

  // Skip headers and empty rows
  if (!parts[0] || parts[0] === '' || parts[0].toLowerCase().includes('retainer')) continue;

  // Get the total (column 10, index 10)
  const total = parseAmount(parts[10]);
  if (total > 0 && parts[0]) {
    payouts.push({
      name: parts[0],
      total,
      month: currentMonth,
      year: currentYear
    });
  }
}

// Group payouts by month
const novPayouts = payouts.filter(p => p.month === '11');
const decPayouts = payouts.filter(p => p.month === '12');

const novTotal = novPayouts.reduce((sum, p) => sum + p.total, 0);
const decTotal = decPayouts.reduce((sum, p) => sum + p.total, 0);

console.log('='.repeat(100));
console.log('REPLACE NOV/DEC AFFILIATE PAYOUTS');
console.log('='.repeat(100));
console.log(`\nNovember 2024 payouts: ${novPayouts.length} creators, total: $${novTotal.toLocaleString()}`);
console.log(`December 2024 payouts: ${decPayouts.length} creators, total: $${decTotal.toLocaleString()}`);

// Read and process the main CSV
const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

let currentSection = '';
let currentCode = '';
let removedNov = 0;
let removedDec = 0;

const newLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check for section header
  const sectionMatch = trimmed.match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentCode = codeMatch ? codeMatch[1] : '';
    newLines.push(line);

    // After 6120 section header, add our replacement entries
    if (currentCode === '6120') {
      // Add November payouts (dated 11/30/2025 so they'll be shifted to October after date shift)
      for (const payout of novPayouts) {
        const entryLine = `,11/30/2025,Journal Entry,NOV_PAYOUT,,${payout.name},Affiliate payout (Nov 2025),6120 Affiliate Marketing Expense,${payout.total.toFixed(2)},`;
        newLines.push(entryLine);
      }

      // Add December payouts (dated 12/31/2025 so they'll be shifted to November after date shift)
      for (const payout of decPayouts) {
        const entryLine = `,12/31/2025,Journal Entry,DEC_PAYOUT,,${payout.name},Affiliate payout (Dec 2025),6120 Affiliate Marketing Expense,${payout.total.toFixed(2)},`;
        newLines.push(entryLine);
      }
    }
    continue;
  }

  // Check if this is an affiliate transaction in Nov or Dec to remove
  // Only remove 6120 (Affiliate Marketing), NOT 6125 (Recruitment bonuses)
  if (currentCode === '6120') {
    const dateMatch = line.match(/^,(\d{2})\/\d{2}\/(\d{4}),/);
    if (dateMatch) {
      const month = dateMatch[1];
      const year = dateMatch[2];

      // Remove Nov 2024, Dec 2024, Nov 2025, Dec 2025 affiliate transactions
      if ((month === '11' || month === '12') && (year === '2024' || year === '2025')) {
        if (month === '11') removedNov++;
        if (month === '12') removedDec++;
        continue; // Skip this line (remove it)
      }
    }
  }

  newLines.push(line);
}

// Write output
fs.writeFileSync(outputPath, newLines.join('\n'));

console.log(`\n### CHANGES:`);
console.log(`  Removed ${removedNov} November affiliate transactions`);
console.log(`  Removed ${removedDec} December affiliate transactions`);
console.log(`  Added ${novPayouts.length} November payout entries`);
console.log(`  Added ${decPayouts.length} December payout entries`);

console.log(`\n${'='.repeat(100)}`);
console.log(`Output written to: ${outputPath}`);
