/**
 * Apply reclassifications to the transaction CSV
 * Based on the review documented in reclassification-log.md
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const outputPath = path.join(__dirname, '../public/all-txn-adjusted.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

// Track changes for logging
const changes: { line: number; from: string; to: string; reason: string }[] = [];
const removals: { line: number; reason: string }[] = [];

// Helper to check if a line matches criteria
function lineMatches(line: string, criteria: {
  name?: string | string[];
  memo?: string | string[];
  amount?: number;
  amountRange?: [number, number];
  date?: string;
}): boolean {
  const nameLower = line.toLowerCase();

  if (criteria.name) {
    const names = Array.isArray(criteria.name) ? criteria.name : [criteria.name];
    if (!names.some(n => nameLower.includes(n.toLowerCase()))) return false;
  }

  if (criteria.memo) {
    const memos = Array.isArray(criteria.memo) ? criteria.memo : [criteria.memo];
    if (!memos.some(m => nameLower.includes(m.toLowerCase()))) return false;
  }

  if (criteria.date && !line.includes(criteria.date)) return false;

  return true;
}

// Process line by line, tracking current section
let currentSection = '';
let currentSectionLine = -1;
const newLines: string[] = [];

// We need to handle this differently - we'll mark lines for changes
// and track which section they're in

interface LineInfo {
  lineNum: number;
  content: string;
  section: string;
  sectionCode: string;
  isTransaction: boolean;
  action?: 'remove' | 'reclassify';
  newSection?: string;
  reason?: string;
}

const lineInfos: LineInfo[] = [];
let currentSectionCode = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check for section header
  const sectionMatch = trimmed.match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentSectionCode = codeMatch ? codeMatch[1] : '';
  }

  // Check if it's a transaction line (has date in second column)
  const isTransaction = /^,\d{2}\/\d{2}\/\d{4},/.test(line);

  lineInfos.push({
    lineNum: i,
    content: line,
    section: currentSection,
    sectionCode: currentSectionCode,
    isTransaction
  });
}

// Apply reclassification rules
for (const info of lineInfos) {
  if (!info.isTransaction) continue;
  const line = info.content.toLowerCase();

  // 1. Remove Amazon Cobra (personal health insurance) from 6495
  if (info.sectionCode === '6495' && line.includes('amazon cobra')) {
    info.action = 'remove';
    info.reason = 'Personal health insurance - not business expense';
    continue;
  }

  // 2. eBay phone farm purchases from 6495 -> 6140
  if (info.sectionCode === '6495' && line.includes('ebay')) {
    info.action = 'reclassify';
    info.newSection = '6140 Advertising Software & Apps';
    info.reason = 'Phone farm equipment for growth marketing';
    continue;
  }

  // 3. Somos Hospitality from 6495 -> 6470
  if (info.sectionCode === '6495' && line.includes('somos hospitality')) {
    info.action = 'reclassify';
    info.newSection = '6470 Travel';
    info.reason = 'Business trip lodging';
    continue;
  }

  // 4. Zamp.com from 6375 -> 6330
  if (info.sectionCode === '6375' && line.includes('zamp')) {
    info.action = 'reclassify';
    info.newSection = '6330 Accounting Prof Services';
    info.reason = 'Sales tax compliance service';
    continue;
  }

  // 5. Luisa Mariana from 6390 -> 6120
  if (info.sectionCode === '6390' && line.includes('luisa mariana')) {
    info.action = 'reclassify';
    info.newSection = '6120 Affiliate Marketing Expense';
    info.reason = 'Affiliate marketing payment';
    continue;
  }

  // 6. SPICY CUBES test purchases from 6390 -> 6375
  if (info.sectionCode === '6390' && line.includes('spicy cubes')) {
    info.action = 'reclassify';
    info.newSection = '6375 Software & Apps';
    info.reason = 'Website QA testing purchases';
    continue;
  }

  // 7. Amazon test purchase from 6390 -> 6375
  if (info.sectionCode === '6390' && line.includes('amazon') && line.includes('mktpl')) {
    info.action = 'reclassify';
    info.newSection = '6375 Software & Apps';
    info.reason = 'Product testing purchase';
    continue;
  }

  // 8. All Meals & Entertainment -> 6470 Travel
  if (info.sectionCode === '6340') {
    info.action = 'reclassify';
    info.newSection = '6470 Travel';
    info.reason = 'Travel-related meal';
    continue;
  }

  // 9. Deel from 6360 -> 6240
  if (info.sectionCode === '6360' && line.includes('deel')) {
    info.action = 'reclassify';
    info.newSection = '6240 Contractors';
    info.reason = 'Contractor management platform';
    continue;
  }

  // 10. Craigslist recruiting from 6360 -> 6240
  if (info.sectionCode === '6360' && line.includes('craigslist')) {
    info.action = 'reclassify';
    info.newSection = '6240 Contractors';
    info.reason = 'Recruiting job postings';
    continue;
  }

  // 11. Creator Contact from 6240 -> 6140
  if (info.sectionCode === '6240' && line.includes('creator contact')) {
    info.action = 'reclassify';
    info.newSection = '6140 Advertising Software & Apps';
    info.reason = 'Creator discovery software';
    continue;
  }

  // 12. Catching Numbers from 6240 -> 6330
  if (info.sectionCode === '6240' && line.includes('catching numbers')) {
    info.action = 'reclassify';
    info.newSection = '6330 Accounting Prof Services';
    info.reason = 'Previous accountant';
    continue;
  }

  // 13. Facebook ads from 6100 -> 6110
  if (info.sectionCode === '6100' && (line.includes('facebook') || line.includes('facebk'))) {
    info.action = 'reclassify';
    info.newSection = '6110 Paid Advertising';
    info.reason = 'Facebook/Meta paid advertising';
    continue;
  }

  // 14. Zelle affiliate payments from 6100 -> 6120
  if (info.sectionCode === '6100' && line.includes('zelle')) {
    info.action = 'reclassify';
    info.newSection = '6120 Affiliate Marketing Expense';
    info.reason = 'Affiliate payment via Zelle';
    continue;
  }

  // 15. Small PayPal payments from 6100 -> 6120 (affiliate payments)
  // Check for PayPal payments that are likely affiliates (small amounts, generic PayPal)
  if (info.sectionCode === '6100' && line.includes('paypal') && !line.includes('catchingnum')) {
    // Extract amount to check if it's a small affiliate payment
    const amountMatch = info.content.match(/,(-?\d+\.?\d*),/g);
    if (amountMatch) {
      const amounts = amountMatch.map(a => Math.abs(parseFloat(a.replace(/,/g, ''))));
      const lastAmount = amounts[amounts.length - 1];
      if (lastAmount <= 100) {
        info.action = 'reclassify';
        info.newSection = '6120 Affiliate Marketing Expense';
        info.reason = 'Affiliate payment via PayPal';
        continue;
      }
    }
  }

  // 16. ROBERTO Venmo from 6150 -> mark as uncategorized (keep but flag)
  // We'll leave these as-is since they need clarification
}

// Generate summary
console.log('='.repeat(80));
console.log('RECLASSIFICATION SUMMARY');
console.log('='.repeat(80));

const reclassifications = lineInfos.filter(l => l.action === 'reclassify');
const removalsCount = lineInfos.filter(l => l.action === 'remove');

console.log(`\nTransactions to REMOVE (personal): ${removalsCount.length}`);
for (const r of removalsCount) {
  console.log(`  Line ${r.lineNum}: ${r.reason}`);
}

console.log(`\nTransactions to RECLASSIFY: ${reclassifications.length}`);
const byNewSection = new Map<string, number>();
for (const r of reclassifications) {
  const count = byNewSection.get(r.newSection!) || 0;
  byNewSection.set(r.newSection!, count + 1);
}
for (const [section, count] of byNewSection) {
  console.log(`  -> ${section}: ${count} transactions`);
}

// Now we need to actually rebuild the CSV
// The tricky part is that transactions need to move to different sections

// First, collect all transactions that need to be moved
const transactionsToMove: Map<string, string[]> = new Map();

for (const info of lineInfos) {
  if (info.action === 'reclassify' && info.newSection) {
    if (!transactionsToMove.has(info.newSection)) {
      transactionsToMove.set(info.newSection, []);
    }
    transactionsToMove.get(info.newSection)!.push(info.content);
  }
}

// Build the new CSV
// For simplicity, we'll:
// 1. Keep the structure intact
// 2. Remove transactions marked for removal
// 3. Remove transactions marked for reclassification from their original location
// 4. Add moved transactions at the end of their new section

const outputLines: string[] = [];
let skipNextTotal = false;

for (let i = 0; i < lineInfos.length; i++) {
  const info = lineInfos[i];

  // Skip removed transactions
  if (info.action === 'remove') {
    continue;
  }

  // Skip reclassified transactions (they'll be added to new section)
  if (info.action === 'reclassify') {
    continue;
  }

  // Check if this is a section header that has transactions to add
  const sectionMatch = info.content.trim().match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    const sectionName = sectionMatch[1].trim();

    // First, output any pending moved transactions for the PREVIOUS section
    // (We need to insert them before the Total line, but for simplicity we'll add after)

    outputLines.push(info.content);

    // Check if there are transactions to add to this section
    if (transactionsToMove.has(sectionName)) {
      const txns = transactionsToMove.get(sectionName)!;
      for (const txn of txns) {
        outputLines.push(txn);
      }
      transactionsToMove.delete(sectionName);
    }
    continue;
  }

  outputLines.push(info.content);
}

// Handle any remaining transactions that need new sections created
for (const [section, txns] of transactionsToMove) {
  console.log(`\nWARNING: Section "${section}" not found in original CSV.`);
  console.log(`  ${txns.length} transactions could not be moved.`);
}

// Write the output
fs.writeFileSync(outputPath, outputLines.join('\n'));

console.log(`\n${'='.repeat(80)}`);
console.log(`Output written to: ${outputPath}`);
console.log(`Original lines: ${lines.length}`);
console.log(`Output lines: ${outputLines.length}`);
console.log(`Removed: ${removalsCount.length} transactions`);
console.log(`Reclassified: ${reclassifications.length} transactions`);
