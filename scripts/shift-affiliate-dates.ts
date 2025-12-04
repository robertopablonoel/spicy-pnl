/**
 * Shift ALL affiliate/creator payments to previous month
 *
 * RATIONALE: Affiliate payments are made for work done in the prior month.
 * For example, a payment made on March 15th is for sales generated in February.
 * Shifting these to the prior month provides a more accurate P&L by matching
 * the expense to the revenue it generated.
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const outputPath = path.join(__dirname, '../public/all-txn.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

let currentSection = '';
let currentCode = '';
let changesCount = 0;

const changes: { original: string; newDate: string; name: string; amount: string }[] = [];

function shiftDateToPreviousMonth(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  let newMonth = parseInt(month) - 1;
  let newYear = parseInt(year);

  if (newMonth === 0) {
    newMonth = 12;
    newYear -= 1;
  }

  // Use same day in previous month (or last day if month is shorter)
  const lastDayOfPrevMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(parseInt(day), lastDayOfPrevMonth);

  return `${newMonth.toString().padStart(2, '0')}/${newDay.toString().padStart(2, '0')}/${newYear}`;
}

const newLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const sectionMatch = line.trim().match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentCode = codeMatch ? codeMatch[1] : '';
    newLines.push(line);
    continue;
  }

  // Only modify 6120 Affiliate Marketing and 6125 Affiliate Recruitment transactions
  if (currentCode !== '6120' && currentCode !== '6125') {
    newLines.push(line);
    continue;
  }

  // Shift ALL affiliate transactions to previous month
  const dateMatch = line.match(/^,(\d{2}\/\d{2}\/\d{4}),/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const newDate = shiftDateToPreviousMonth(dateStr);
    const newLine = line.replace(`,${dateStr},`, `,${newDate},`);

    // Extract name and amount for logging
    const parts = line.split(',');
    const name = parts[4] || '';
    const amount = parts[8] || '';

    changes.push({ original: dateStr, newDate, name, amount });
    changesCount++;
    newLines.push(newLine);
    continue;
  }

  newLines.push(line);
}

// Write output
fs.writeFileSync(outputPath, newLines.join('\n'));

console.log('='.repeat(100));
console.log('AFFILIATE DATE SHIFT SUMMARY');
console.log('='.repeat(100));
console.log(`\nShifted ${changesCount} affiliate payments to previous month:\n`);

// Group by original month
const byMonth = new Map<string, typeof changes>();
for (const c of changes) {
  const [month, , year] = c.original.split('/');
  const key = `${month}/${year}`;
  if (!byMonth.has(key)) byMonth.set(key, []);
  byMonth.get(key)!.push(c);
}

for (const [monthKey, monthChanges] of Array.from(byMonth.entries()).sort()) {
  console.log(`\n${monthKey} -> Previous month:`);
  let total = 0;
  for (const c of monthChanges) {
    const amt = parseFloat(c.amount.replace(/[$,]/g, '')) || 0;
    total += amt;
    console.log(`  ${c.original} -> ${c.newDate}  ${c.name.substring(0, 25).padEnd(27)} $${c.amount}`);
  }
  console.log(`  Subtotal: $${total.toFixed(2)}`);
}

console.log(`\n${'='.repeat(100)}`);
console.log(`Total transactions shifted: ${changesCount}`);
console.log(`Output written to: ${outputPath}`);
