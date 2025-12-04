/**
 * Apply reclassifications and removals to the transaction CSV
 *
 * KEY INSIGHT: The P&L is calculated from the SECTION HEADER, not column 8.
 * A transaction under the "6120 Affiliate Marketing Expense,,,,,,,,," section
 * gets counted towards 6120, regardless of what column 8 says.
 *
 * So for reclassifications we ONLY need to move transactions between P&L sections.
 * We leave bank-section transactions unchanged (they don't affect P&L calculation).
 *
 * For removals (personal expenses), we remove from BOTH bank and P&L sections
 * since we want to completely exclude them from the P&L.
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const outputPath = path.join(__dirname, '../public/all-txn.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

// Track current section
let currentSection = '';
let currentCode = '';

interface LineInfo {
  lineNum: number;
  content: string;
  section: string;
  sectionCode: string;
  isPnLSection: boolean;
}

function isPnLAccount(code: string): boolean {
  const num = parseInt(code);
  return !isNaN(num) && num >= 4000 && num < 8000;
}

const lineInfos: LineInfo[] = [];

// First pass: catalog all lines with their sections
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check for section header
  const sectionMatch = trimmed.match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    const codeMatch = currentSection.match(/^(\d{4})/);
    currentCode = codeMatch ? codeMatch[1] : '';
  }

  lineInfos.push({
    lineNum: i,
    content: line,
    section: currentSection,
    sectionCode: currentCode,
    isPnLSection: isPnLAccount(currentCode)
  });
}

// Define removal rules (personal expenses) - apply to ALL sections
interface RemovalRule {
  pattern: RegExp;
  reason: string;
}

const removals: RemovalRule[] = [
  { pattern: /amazon cobra/i, reason: 'Personal health insurance' },
];

// Define reclassification rules - ONLY apply to P&L sections
interface ReclassifyRule {
  fromCode: string;
  pattern: RegExp;
  toCode: string;
  reason: string;
  amount?: number;  // Optional: match specific amount
}

const reclassifications: ReclassifyRule[] = [
  // 6120 -> 6125: $30 affiliate recruitment (sample video payments)
  { fromCode: '6120', pattern: /./, toCode: '6125', reason: 'Affiliate recruitment', amount: 30 },

  // 6120 -> 6125: Yvel and Gabriella are affiliate recruiters
  { fromCode: '6120', pattern: /yvel/i, toCode: '6125', reason: 'Affiliate recruitment' },
  { fromCode: '6120', pattern: /gabriella/i, toCode: '6125', reason: 'Affiliate recruitment' },

  // 6495 -> 6140: eBay phone farm equipment
  { fromCode: '6495', pattern: /ebay/i, toCode: '6140', reason: 'Phone farm equipment' },

  // 6495 -> 6470: Somos Hospitality
  { fromCode: '6495', pattern: /somos hospitality/i, toCode: '6470', reason: 'Business trip lodging' },

  // 6375 -> 6330: Zamp.com
  { fromCode: '6375', pattern: /zamp/i, toCode: '6330', reason: 'Sales tax compliance' },

  // 6390 -> 6120: Luisa Mariana
  { fromCode: '6390', pattern: /luisa mariana/i, toCode: '6120', reason: 'Affiliate payment' },

  // 6390 -> 6375: SPICY CUBES test purchases
  { fromCode: '6390', pattern: /spicy cubes/i, toCode: '6375', reason: 'Website QA testing' },

  // 6390 -> 6375: Amazon test purchase
  { fromCode: '6390', pattern: /amazon.*mktpl/i, toCode: '6375', reason: 'Product testing' },

  // 6340 -> 6470: All Meals & Entertainment (travel meals)
  { fromCode: '6340', pattern: /./, toCode: '6470', reason: 'Travel-related meal' },

  // 6360 -> 6240: Deel
  { fromCode: '6360', pattern: /deel/i, toCode: '6240', reason: 'Contractor management' },

  // 6360 -> 6240: Craigslist
  { fromCode: '6360', pattern: /craigslist/i, toCode: '6240', reason: 'Recruiting job postings' },

  // 6240 -> 6140: Creator Contact
  { fromCode: '6240', pattern: /creator contact/i, toCode: '6140', reason: 'Creator discovery software' },

  // 6240 -> 6330: Catching Numbers
  { fromCode: '6240', pattern: /catching numbers/i, toCode: '6330', reason: 'Previous accountant' },

  // 6100 -> 6110: Facebook ads
  { fromCode: '6100', pattern: /facebook|facebk/i, toCode: '6110', reason: 'Paid advertising' },

  // 6100 -> 6120: Zelle affiliate payments
  { fromCode: '6100', pattern: /zelle/i, toCode: '6120', reason: 'Affiliate payment' },

  // 6100 -> 6120: PayPal affiliate payments (excluding Catching Numbers)
  { fromCode: '6100', pattern: /paypal(?!.*catchingnum)/i, toCode: '6120', reason: 'Affiliate payment' },
];

// Track changes
const removedLines: { line: string; reason: string }[] = [];
const reclassifiedLines: { line: string; from: string; to: string; reason: string }[] = [];

// Helper: Check if a line is a transaction (has date in column 2)
function isTransaction(line: string): boolean {
  return /^,\d{2}\/\d{2}\/\d{4},/.test(line);
}

// Helper: Extract amount from a transaction line (column 9, index 8)
function getTransactionAmount(line: string): number | null {
  const parts = line.split(',');
  if (parts.length >= 9) {
    const amountStr = parts[8].replace(/[$",]/g, '');
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? null : Math.abs(amount);
  }
  return null;
}

// Process lines and mark for removal/reclassification
const linesToRemove = new Set<number>();
const lineReclassifications = new Map<number, { toCode: string; reason: string }>();

for (const info of lineInfos) {
  if (!isTransaction(info.content)) continue;

  const lineLower = info.content.toLowerCase();

  // Check removal rules - apply to ALL transactions (both bank and P&L sections)
  for (const rule of removals) {
    if (rule.pattern.test(lineLower)) {
      linesToRemove.add(info.lineNum);
      removedLines.push({ line: info.content.substring(0, 100), reason: rule.reason });
      break;
    }
  }

  if (linesToRemove.has(info.lineNum)) continue;

  // Check reclassification rules - ONLY for P&L section transactions
  if (info.isPnLSection) {
    const txnAmount = getTransactionAmount(info.content);

    for (const rule of reclassifications) {
      // Check if section matches
      if (info.sectionCode !== rule.fromCode) continue;

      // Check if pattern matches
      if (!rule.pattern.test(lineLower)) continue;

      // Check if amount matches (if specified)
      if (rule.amount !== undefined && txnAmount !== rule.amount) continue;

      lineReclassifications.set(info.lineNum, { toCode: rule.toCode, reason: rule.reason });
      reclassifiedLines.push({
        line: info.content.substring(0, 80),
        from: rule.fromCode,
        to: rule.toCode,
        reason: rule.reason
      });
      break;
    }
  }
}

// Collect P&L section lines that need to move to a different section
const linesToAddToSection = new Map<string, string[]>();

for (const info of lineInfos) {
  const reclass = lineReclassifications.get(info.lineNum);
  if (reclass && info.isPnLSection) {
    if (!linesToAddToSection.has(reclass.toCode)) {
      linesToAddToSection.set(reclass.toCode, []);
    }
    linesToAddToSection.get(reclass.toCode)!.push(info.content);
  }
}

// Build output
const outputLines: string[] = [];

for (const info of lineInfos) {
  // Skip removed lines
  if (linesToRemove.has(info.lineNum)) {
    continue;
  }

  // Check if this is a section header
  const sectionMatch = info.content.trim().match(/^([^,]+),,,,,,,,,$/);
  if (sectionMatch) {
    outputLines.push(info.content);

    const sectionName = sectionMatch[1].trim();
    const codeMatch = sectionName.match(/^(\d{4})/);
    const sectionCode = codeMatch ? codeMatch[1] : '';

    // Add any reclassified lines that belong to this section (match by code)
    if (sectionCode && linesToAddToSection.has(sectionCode)) {
      for (const line of linesToAddToSection.get(sectionCode)!) {
        outputLines.push(line);
      }
      linesToAddToSection.delete(sectionCode);
    }
    continue;
  }

  // Skip P&L section lines that are being reclassified (they were added to their new section)
  if (info.isPnLSection && lineReclassifications.has(info.lineNum)) {
    continue;
  }

  // Keep all other lines as-is (including bank section lines)
  outputLines.push(info.content);
}

// Check for any sections that weren't found - create them
// New sections to create (code -> full section name)
const newSections: Record<string, string> = {
  '6125': '6125 Affiliate Recruitment',
};

for (const [code, txnLines] of linesToAddToSection) {
  if (newSections[code]) {
    // Create new section at the end of the file (before any trailing empty lines)
    console.log(`\nCreating new section: ${newSections[code]} with ${txnLines.length} transactions`);
    outputLines.push(`${newSections[code]},,,,,,,,,`);
    for (const line of txnLines) {
      outputLines.push(line);
    }
  } else {
    console.log(`\nWARNING: Section with code "${code}" not found. ${txnLines.length} transactions could not be moved.`);
  }
}

// Write output
fs.writeFileSync(outputPath, outputLines.join('\n'));

// Print summary
console.log('='.repeat(100));
console.log('ADJUSTMENT SUMMARY');
console.log('='.repeat(100));

console.log(`\n### REMOVED (Personal Expenses): ${removedLines.length} transactions`);
const uniqueRemovals = new Map<string, number>();
for (const r of removedLines) {
  uniqueRemovals.set(r.reason, (uniqueRemovals.get(r.reason) || 0) + 1);
}
for (const [reason, count] of uniqueRemovals) {
  console.log(`  - ${reason}: ${count} transactions`);
}

console.log(`\n### RECLASSIFIED: ${reclassifiedLines.length} transactions`);
const byMove = new Map<string, number>();
for (const r of reclassifiedLines) {
  const key = `${r.from} -> ${r.to}`;
  byMove.set(key, (byMove.get(key) || 0) + 1);
}
for (const [move, count] of byMove) {
  console.log(`  ${move}: ${count} transactions`);
}

console.log(`\n${'='.repeat(100)}`);
console.log(`Output written to: ${outputPath}`);
console.log(`Original lines: ${lines.length}`);
console.log(`Output lines: ${outputLines.length}`);
