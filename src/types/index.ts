// P&L Section classification
export type PLSection =
  | 'revenue'
  | 'cogs'
  | 'costOfSales'
  | 'operatingExpenses'
  | 'otherIncome';

// Core transaction from CSV
export interface RawTransaction {
  transactionDate: string;
  transactionType: string;
  num: string;
  name: string;
  classFullName: string;
  memo: string;
  accountFullName: string;
  amount: number;
  balance: number;
}

// Transaction with enriched data
export interface Transaction extends RawTransaction {
  id: string;
  month: string;
  accountCode: string;
  parentAccountCode: string | null;
}

// Parsed account structure
export interface Account {
  code: string;
  name: string;
  fullName: string;
  parentCode: string | null;
  section: PLSection;
  children: string[];
  depth: number;
}

// Monthly aggregation
export interface MonthlyAmount {
  month: string;
  amount: number;
}

// P&L row for display
export interface PLRow {
  accountCode: string;
  account: Account;
  monthlyAmounts: Record<string, number>;
  ytdTotal: number;
  transactionCount: number;
}

// Summary metrics
export interface PLSummary {
  grossRevenue: number;
  netRevenue: number;
  totalCOGS: number;
  totalCostOfSales: number;
  grossProfit: number;
  grossMargin: number;
  totalOpEx: number;
  otherIncome: number;
  netIncome: number;
  netMargin: number;
}

// Application state
export interface PLState {
  transactions: Transaction[];
  accounts: Map<string, Account>;
  expandedAccounts: Set<string>;
  expandedMonths: Set<string>;
  months: string[];
  loading: boolean;
  error: string | null;
}

// Action types
export type PLAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_DATA'; payload: { transactions: Transaction[]; accounts: Map<string, Account>; months: string[] } }
  | { type: 'TOGGLE_ACCOUNT'; payload: string }
  | { type: 'TOGGLE_MONTH'; payload: string };
