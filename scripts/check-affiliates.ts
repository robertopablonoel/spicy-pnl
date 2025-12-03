import * as fs from 'fs';
import * as path from 'path';

const content = fs.readFileSync(path.join(__dirname, '../public/all-txn.csv'), 'utf-8');
const lines = content.split('\n');

let currentSection = '';
let currentCode = '';

interface Txn {
  date: string;
  name: string;
  amount: number;
  day: string;
}

const transactions: Txn[] = [];

for (const line of lines) {
  const sectionMatch = line.trim().match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentCode = codeMatch ? codeMatch[1] : '';
    continue;
  }

  if (currentCode === '6120') {
    const dateMatch = line.match(/^,(\d{2})\/(\d{2})\/(\d{4}),/);
    if (dateMatch) {
      const parts = line.split(',');
      const date = parts[1];
      const [month, day, year] = date.split('/');
      const name = parts[4] || '';
      const amountStr = parts[8] || '0';
      const amount = parseFloat(amountStr.replace(/[$,"]/g, '')) || 0;
      transactions.push({ date, name, amount, day });
    }
  }
}

const total = transactions.reduce((sum, t) => sum + t.amount, 0);

console.log('6120 Affiliate Marketing Summary:');
console.log('='.repeat(60));
console.log(`Total transactions: ${transactions.length}`);
console.log(`Total amount: $${total.toFixed(2)}`);

// By month
const byMonth = new Map<string, { count: number; total: number }>();
for (const t of transactions) {
  const [month, , year] = t.date.split('/');
  const key = `${year}-${month}`;
  const existing = byMonth.get(key) || { count: 0, total: 0 };
  existing.count++;
  existing.total += t.amount;
  byMonth.set(key, existing);
}

console.log('\nBy Month:');
for (const [month, data] of Array.from(byMonth.entries()).sort()) {
  console.log(`  ${month}: ${data.count} txns, $${data.total.toFixed(2)}`);
}

// Count how many are on 1st/2nd
const firstSecond = transactions.filter(t => t.day === '01' || t.day === '02');
console.log(`\nTransactions on 1st/2nd of month: ${firstSecond.length}`);
console.log(`Transactions on other days: ${transactions.length - firstSecond.length}`);
