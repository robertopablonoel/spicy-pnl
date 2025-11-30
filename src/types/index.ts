// P&L Section classification
export type PLSection =
  | 'revenue'
  | 'cogs'
  | 'costOfSales'
  | 'operatingExpenses'
  | 'otherIncome'
  | 'excluded';

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

// Tagging system
export interface TransactionTag {
  category: 'personal' | 'nonRecurring';
  subAccount: string;
  taggedAt: number;
}

export interface TagConfig {
  personal: string[];
  nonRecurring: string[];
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
  taggedItemsCount: number;
  taggedAmount: number;
}

// Application state
export interface PLState {
  transactions: Transaction[];
  accounts: Map<string, Account>;
  tags: Record<string, TransactionTag>;
  tagConfig: TagConfig;
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
  | { type: 'TOGGLE_MONTH'; payload: string }
  | { type: 'TAG_TRANSACTION'; payload: { transactionId: string; tag: TransactionTag } }
  | { type: 'UNTAG_TRANSACTION'; payload: string }
  | { type: 'ADD_SUB_ACCOUNT'; payload: { category: 'personal' | 'nonRecurring'; name: string } }
  | { type: 'LOAD_TAGS'; payload: { tags: Record<string, TransactionTag>; config: TagConfig } };
