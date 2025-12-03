/**
 * Analyze P&L transactions for potential misclassifications
 */

import * as fs from 'fs';
import * as path from 'path';

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

const dataPath = path.join(__dirname, 'all-pnl-transactions.json');
const data: Record<string, AccountData> = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const ACCOUNT_NAMES: Record<string, string> = {
  '4000': 'Sales',
  '4010': 'Discounts',
  '4020': 'Refunds',
  '4030': 'Shipping Income',
  '4040': 'Chargebacks',
  '5000': 'Cost of Goods Sold',
  '5010': 'Inbound Freight & Shipping',
  '5030': 'Inventory Adjustment',
  '5040': 'Inventory Shrinkage',
  '5050': 'COGS - Other',
  '6010': 'Outbound Shipping & Delivery',
  '6020': '3PL Expense',
  '6035': 'Packaging Supplies',
  '6055': 'Amazon Seller Fees',
  '6065': 'Shopify Merchant Fees',
  '6070': 'Shopify Selling Apps',
  '6075': 'Other Merchant Processing Fees',
  '6100': 'Advertising & Marketing',
  '6110': 'Paid Advertising',
  '6120': 'Affiliate Marketing Expense',
  '6130': 'Marketing Contractors',
  '6140': 'Advertising Software & Apps',
  '6150': 'Other Adv & Marketing',
  '6210': 'Bank Charges & Fees',
  '6240': 'Contractors',
  '6250': 'Dues & Subscriptions',
  '6260': 'Education & Training',
  '6290': 'Insurance',
  '6300': 'Legal & Professional Services',
  '6320': 'Professional Expenses',
  '6330': 'Accounting Prof Services',
  '6340': 'Meals & Entertainment',
  '6360': 'Other General & Admin',
  '6375': 'Software & Apps',
  '6390': 'Product Development',
  '6410': 'Rent & Lease',
  '6450': 'Taxes & Licenses',
  '6470': 'Travel',
  '6495': 'Discretionary Spending',
  '7000': 'Interest Income',
};

function fmt(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function printAccount(code: string) {
  const account = data[code];
  if (!account) return;

  console.log(`\n${'='.repeat(100)}`);
  console.log(`${code} ${ACCOUNT_NAMES[code]} (${account.count} txns, YTD: ${fmt(account.total)})`);
  console.log('='.repeat(100));
  console.log('Date'.padEnd(12) + 'Name'.padEnd(30) + 'Amount'.padStart(12) + '  Memo');
  console.log('-'.repeat(100));

  for (const txn of account.transactions) {
    console.log(
      txn.date.padEnd(12) +
      txn.name.substring(0, 28).padEnd(30) +
      fmt(txn.amount).padStart(12) +
      '  ' + txn.memo.substring(0, 45)
    );
  }
}

// Print accounts that commonly have misclassifications
const accountsToReview = [
  '6210', // Bank Charges - often has misc items
  '6240', // Contractors
  '6300', // Legal & Professional
  '6320', // Professional Expenses
  '6340', // Meals & Entertainment
  '6360', // Other General & Admin - catch-all
  '6375', // Software & Apps
  '6390', // Product Development
  '6450', // Taxes & Licenses
  '6470', // Travel
  '6495', // Discretionary Spending
  '5050', // COGS - Other
  '6100', // Advertising & Marketing (parent)
  '6150', // Other Adv & Marketing
];

console.log('TRANSACTION REVIEW FOR POTENTIAL MISCLASSIFICATIONS');
console.log('Review each account and flag any transactions that appear misclassified.');

for (const code of accountsToReview) {
  printAccount(code);
}
