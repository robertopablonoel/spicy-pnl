/**
 * Add November Shopify revenue and COGS journal entries
 *
 * RATIONALE: November sales data comes from Shopify and needs to be added
 * as journal entries since QuickBooks doesn't have the direct integration.
 *
 * Note: COGS for Jan-Oct is already in QuickBooks as monthly journal entries.
 * This script only adds November entries.
 *
 * Total Sales Breakdown (November):
 * - Gross sales: $598,732.40
 * - Discounts: -$143,321.35
 * - Returns: -$19,982.96
 * - Shipping charges: $39,659.04
 * - COGS: $85,199.62
 */

import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, '../public/all-txn.csv');
const outputPath = path.join(__dirname, '../public/all-txn.csv');

const content = fs.readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

// November Shopify journal entries to add
const NOVEMBER_ENTRIES = [
  { account: '4000 Sales', memo: 'Shopify Sales', amount: 598732.40 },
  { account: '4010 Discounts', memo: 'Shopify Discounts', amount: -143321.35 },
  { account: '4020 Refunds', memo: 'Shopify Returns', amount: -19982.96 },
  { account: '4030 Shipping Income', memo: 'Shopify Shipping Income', amount: 39659.04 },
  { account: '5000 Cost of Goods Sold', memo: 'Shopify COGS', amount: 85199.62 },
];

// Build new lines with entries inserted
const newLines: string[] = [];
let entriesAdded = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  newLines.push(line);

  // Add November entries after matching section headers
  for (const entry of NOVEMBER_ENTRIES) {
    if (line.trim().startsWith(entry.account + ',')) {
      const journalLine = `,11/30/2025,Journal Entry,2025_11_Shopify,,Shopify,${entry.memo},,${entry.amount.toFixed(2)},0.00`;
      newLines.push(journalLine);
      entriesAdded++;
    }
  }
}

// Write output
fs.writeFileSync(outputPath, newLines.join('\n'));

console.log('='.repeat(100));
console.log('NOVEMBER SHOPIFY JOURNAL ENTRIES');
console.log('='.repeat(100));
console.log('\nAdded the following November entries:\n');

for (const entry of NOVEMBER_ENTRIES) {
  console.log(`  ${entry.account.padEnd(25)} ${entry.memo.padEnd(25)} $${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
}

console.log(`\n${'='.repeat(100)}`);
console.log(`Total entries added: ${entriesAdded}`);
console.log(`Output written to: ${outputPath}`);
