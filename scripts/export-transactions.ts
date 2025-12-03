/**
 * Export all P&L transactions to JSON for analysis
 */

import * as fs from 'fs';
import * as path from 'path';

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
  const cleaned = str.replace(/[$,"]/g, '');
  return parseFloat(cleaned) || 0;
}

function isPnLAccount(code: string): boolean {
  const num = parseInt(code, 10);
  return num >= 4000 && num < 8000;
}

function extractSectionCode(header: string): string {
  const match = header.match(/^(\d{4})/);
  return match ? match[1] : '';
}

interface Transaction {
  date: string;
  type: string;
  num: string;
  name: string;
  memo: string;
  amount: number;
}

interface AccountData {
  section: string;
  count: number;
  total: number;
  transactions: Transaction[];
}

const txnPath = path.join(__dirname, '../public/all-txn.csv');
const content = fs.readFileSync(txnPath, 'utf-8');
const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const lines = normalized.split('\n');

let currentSection: string | null = null;
let currentSectionCode: string | null = null;

const txnsByAccount = new Map<string, { section: string; txns: Transaction[] }>();

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

  const amount = parseAmount(fields[8]);
  const txn: Transaction = {
    date: dateField,
    type: fields[2] || '',
    num: fields[3] || '',
    name: fields[4] || '',
    memo: fields[6] || '',
    amount: amount
  };

  if (!txnsByAccount.has(currentSectionCode)) {
    txnsByAccount.set(currentSectionCode, { section: currentSection!, txns: [] });
  }
  txnsByAccount.get(currentSectionCode)!.txns.push(txn);
}

// Output JSON for analysis
const output: Record<string, AccountData> = {};
for (const [code, data] of txnsByAccount.entries()) {
  output[code] = {
    section: data.section,
    count: data.txns.length,
    total: data.txns.reduce((sum, t) => sum + t.amount, 0),
    transactions: data.txns
  };
}

const outputPath = path.join(__dirname, 'all-pnl-transactions.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Exported ${txnsByAccount.size} accounts to ${outputPath}`);
