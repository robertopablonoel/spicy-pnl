import { Transaction, Account, PLRow, PLSummary, PLSection } from '@/types';

// Get all transactions for an account (including children)
export function getAccountTransactions(
  accountCode: string,
  transactions: Transaction[],
  accounts: Map<string, Account>
): Transaction[] {
  const account = accounts.get(accountCode);
  if (!account) return [];

  // Get direct transactions
  let result = transactions.filter(t => {
    return t.accountCode === accountCode ||
      (t.parentAccountCode === accountCode && !accounts.has(t.accountCode));
  });

  // Add child account transactions
  for (const childCode of account.children) {
    result = result.concat(
      getAccountTransactions(childCode, transactions, accounts)
    );
  }

  return result;
}

// Calculate monthly amounts for an account
export function calculateMonthlyAmounts(
  accountCode: string,
  transactions: Transaction[],
  accounts: Map<string, Account>,
  months: string[]
): { monthlyAmounts: Record<string, number>; ytdTotal: number; transactionCount: number } {
  const accountTransactions = getAccountTransactions(accountCode, transactions, accounts);

  const monthlyAmounts: Record<string, number> = {};
  months.forEach(m => { monthlyAmounts[m] = 0; });

  let ytdTotal = 0;

  for (const txn of accountTransactions) {
    if (txn.month && monthlyAmounts[txn.month] !== undefined) {
      monthlyAmounts[txn.month] += txn.amount;
      ytdTotal += txn.amount;
    }
  }

  return { monthlyAmounts, ytdTotal, transactionCount: accountTransactions.length };
}

// Build P&L rows for a section
export function buildPLRows(
  section: PLSection,
  transactions: Transaction[],
  accounts: Map<string, Account>,
  months: string[]
): PLRow[] {
  const rows: PLRow[] = [];

  // Get top-level accounts for this section
  const topLevelAccounts = Array.from(accounts.values())
    .filter(a => a.section === section && a.parentCode === null)
    .sort((a, b) => a.code.localeCompare(b.code));

  for (const account of topLevelAccounts) {
    const { monthlyAmounts, ytdTotal, transactionCount } = calculateMonthlyAmounts(
      account.code, transactions, accounts, months
    );

    // Only add if there's activity
    if (ytdTotal !== 0 || transactionCount > 0) {
      rows.push({
        accountCode: account.code,
        account,
        monthlyAmounts,
        ytdTotal,
        transactionCount
      });
    }
  }

  return rows;
}

// Calculate P&L summary metrics
export function calculatePLSummary(
  transactions: Transaction[],
  accounts: Map<string, Account>
): PLSummary {
  // Simple calculation by account code range
  const byCodeRange = (minCode: number, maxCode: number) =>
    transactions
      .filter(t => {
        const code = parseInt(t.accountCode, 10);
        return code >= minCode && code < maxCode;
      })
      .reduce((sum, t) => sum + t.amount, 0);

  // Calculate by section using code ranges directly
  const bySection = (section: PLSection) => {
    switch (section) {
      case 'revenue': return byCodeRange(4000, 4100);
      case 'cogs': return byCodeRange(5000, 6000);
      case 'costOfSales': return byCodeRange(6000, 6100);
      case 'operatingExpenses': return byCodeRange(6100, 7000);
      case 'otherIncome': return byCodeRange(7000, 8000);
      default: return 0;
    }
  };

  // Revenue breakdown
  const revenueTransactions = transactions.filter(t => {
    const code = parseInt(t.accountCode, 10);
    return code >= 4000 && code < 4100;
  });

  // Gross revenue (4000 Sales + 4030 Shipping)
  const grossRevenue = revenueTransactions
    .filter(t => t.accountCode === '4000' || t.accountCode === '4030')
    .reduce((sum, t) => sum + t.amount, 0);

  // Contra revenue (discounts, refunds, chargebacks - these are negative)
  const contraRevenue = revenueTransactions
    .filter(t => t.accountCode === '4010' || t.accountCode === '4020' || t.accountCode === '4040')
    .reduce((sum, t) => sum + t.amount, 0);

  const netRevenue = grossRevenue + contraRevenue;

  // Cost sections
  const totalCOGS = bySection('cogs');
  const totalCostOfSales = bySection('costOfSales');
  const totalOpEx = bySection('operatingExpenses');
  const otherIncome = bySection('otherIncome');

  // Calculated metrics
  const grossProfit = netRevenue - totalCOGS - totalCostOfSales;
  const grossMargin = netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netIncome = grossProfit - totalOpEx + otherIncome;
  const netMargin = netRevenue !== 0 ? (netIncome / netRevenue) * 100 : 0;

  return {
    grossRevenue,
    netRevenue,
    totalCOGS,
    totalCostOfSales,
    grossProfit,
    grossMargin,
    totalOpEx,
    otherIncome,
    netIncome,
    netMargin
  };
}

// Group transactions by month
export function groupTransactionsByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};

  for (const txn of transactions) {
    if (!grouped[txn.month]) {
      grouped[txn.month] = [];
    }
    grouped[txn.month].push(txn);
  }

  // Sort transactions within each month by date
  for (const month of Object.keys(grouped)) {
    grouped[month].sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      return dateA.getTime() - dateB.getTime();
    });
  }

  return grouped;
}

// Calculate section total for a month
export function calculateSectionMonthlyTotal(
  section: PLSection,
  transactions: Transaction[],
  accounts: Map<string, Account>,
  month: string
): number {
  return transactions
    .filter(t => {
      if (t.month !== month) return false;

      const account = accounts.get(t.accountCode);
      if (!account) return false;

      if (account.section === section) return true;
      if (t.parentAccountCode) {
        const parent = accounts.get(t.parentAccountCode);
        if (parent?.section === section) return true;
      }
      return false;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}
