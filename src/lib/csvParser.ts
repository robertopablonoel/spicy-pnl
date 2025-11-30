import { RawTransaction, Transaction, Account, PLSection } from '@/types';

// Parse a CSV line handling quoted fields with commas
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

// Parse amount string to number (handles commas, quotes, negative values)
function parseAmount(str: string): number {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(/[$,"]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse date to YYYY-MM format
function parseMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const month = parts[0].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}`;
}

// Extract account code from account full name
function extractAccountCode(accountFullName: string): { code: string; parentCode: string | null } {
  if (!accountFullName) return { code: '', parentCode: null };

  const parts = accountFullName.split(':');

  if (parts.length === 1) {
    // Single account like "4000 Sales"
    const match = accountFullName.match(/^(\d{4})/);
    return { code: match ? match[1] : '', parentCode: null };
  }

  // Hierarchical like "6000 Cost of Sales:6065 Shopify Merchant Fees"
  const lastPart = parts[parts.length - 1].trim();
  const parentPart = parts[0].trim();

  const codeMatch = lastPart.match(/^(\d{4})/);
  const parentMatch = parentPart.match(/^(\d{4})/);

  return {
    code: codeMatch ? codeMatch[1] : '',
    parentCode: parentMatch ? parentMatch[1] : null
  };
}

// Check if code is a P&L account (4000-7999)
function isPnLAccount(code: string): boolean {
  const num = parseInt(code, 10);
  return num >= 4000 && num < 8000;
}

// Extract code from section header
function extractSectionCode(sectionHeader: string): string {
  const match = sectionHeader.match(/^(\d{4})/);
  return match ? match[1] : '';
}

// Classify account by code
function classifyAccount(code: string): PLSection {
  const numCode = parseInt(code, 10);

  if (numCode >= 4000 && numCode < 4100) return 'revenue';
  if (numCode >= 5000 && numCode < 6000) return 'cogs';
  if (numCode >= 6000 && numCode < 6100) return 'costOfSales';
  if (numCode >= 6100 && numCode < 7000) return 'operatingExpenses';
  if (numCode >= 7000 && numCode < 8000) return 'otherIncome';

  return 'operatingExpenses';
}

// Generate unique transaction ID
function generateTransactionId(txn: RawTransaction, index: number): string {
  const date = txn.transactionDate.replace(/\//g, '-');
  const account = txn.accountFullName.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `txn-${date}-${account}-${index}`;
}

// Extract account name from code and full name
function extractAccountName(fullName: string): string {
  const parts = fullName.split(':');
  const lastPart = parts[parts.length - 1].trim();
  // Remove the code prefix (e.g., "6065 Shopify Merchant Fees" -> "Shopify Merchant Fees")
  return lastPart.replace(/^\d{4}\s+/, '');
}

export interface ParseResult {
  transactions: Transaction[];
  accounts: Map<string, Account>;
  months: string[];
}

export function parseCSV(csvContent: string): ParseResult {
  // Normalize line endings (handle Windows \r\n)
  const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const rawTransactions: RawTransaction[] = [];
  const accountsMap = new Map<string, Account>();
  const monthsSet = new Set<string>();

  // Track current section header and its code
  // KEY INSIGHT: This is a double-entry accounting export. Each transaction appears twice:
  // once under the bank/credit card account, once under the P&L account.
  // We ONLY want transactions from P&L sections (4xxx-7xxx), using the section header as the account.
  // Column 8 shows the OFFSETTING account (bank), not the P&L account.
  let currentSection: string | null = null;
  let currentSectionCode: string | null = null;

  // Skip header rows (first 5 lines)
  for (let i = 5; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line || line === ',,,,,,,,,') continue;

    // Skip total rows
    if (line.startsWith('Total for')) continue;

    // Check for ANY section header (lines ending with ,,,,,,,,,)
    // These can be numeric like "4000 Sales,,,,,,,,," or non-numeric like "Credit Card,,,,,,,,,"
    // We need to detect ALL headers to properly exit P&L sections when entering non-P&L sections
    const sectionMatch = line.match(/^([^,]+),,,,,,,,,$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      currentSectionCode = extractSectionCode(currentSection);
      continue;
    }

    // Skip if we're not in a P&L section (only include 4xxx-7xxx accounts)
    if (!currentSectionCode || !isPnLAccount(currentSectionCode)) {
      continue;
    }

    // Parse the line
    const fields = parseCSVLine(line);

    // Transaction rows start with empty first field and have a date in second field
    const dateField = fields[1];
    if (!dateField || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) continue;

    // ALWAYS use the current section as the account
    // This is the KEY FIX - column 8 shows the offsetting bank account, not the P&L account
    const accountFullName = currentSection!;

    const raw: RawTransaction = {
      transactionDate: dateField,
      transactionType: fields[2] || '',
      num: fields[3] || '',
      name: fields[4] || '',
      classFullName: fields[5] || '',
      memo: fields[6] || '',
      accountFullName: accountFullName,
      amount: parseAmount(fields[8]),
      balance: parseAmount(fields[9])
    };

    rawTransactions.push(raw);
  }

  // Process transactions and build accounts
  const transactions: Transaction[] = rawTransactions.map((raw, index) => {
    const { code, parentCode } = extractAccountCode(raw.accountFullName);
    const month = parseMonth(raw.transactionDate);

    if (month) monthsSet.add(month);

    // Build account if not exists
    if (code && !accountsMap.has(code)) {
      accountsMap.set(code, {
        code,
        name: extractAccountName(raw.accountFullName),
        fullName: raw.accountFullName,
        parentCode,
        section: classifyAccount(code),
        children: [],
        depth: parentCode ? 1 : 0
      });
    }

    // Update parent's children
    if (parentCode && code) {
      const parent = accountsMap.get(parentCode);
      if (parent && !parent.children.includes(code)) {
        parent.children.push(code);
      } else if (!parent) {
        // Create parent account stub
        const parts = raw.accountFullName.split(':');
        const parentPart = parts[0].trim();
        accountsMap.set(parentCode, {
          code: parentCode,
          name: extractAccountName(parentPart),
          fullName: parentPart,
          parentCode: null,
          section: classifyAccount(parentCode),
          children: [code],
          depth: 0
        });
      }
    }

    return {
      ...raw,
      id: generateTransactionId(raw, index),
      month,
      accountCode: code,
      parentAccountCode: parentCode
    };
  });

  // Sort months chronologically
  const months = Array.from(monthsSet).sort();

  return { transactions, accounts: accountsMap, months };
}

// Format currency for display
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(absAmount);

  return amount < 0 ? `(${formatted})` : formatted;
}

// Format month for display
export function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
