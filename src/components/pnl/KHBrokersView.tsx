'use client';

import { useMemo, useState } from 'react';
import { usePL } from '@/context/PLContext';
import { formatCurrency, formatMonth } from '@/lib/csvParser';
import { Transaction, TransactionTag } from '@/types';
import { ChevronIcon } from '@/components/ui/ChevronIcon';
import { TransactionRow } from './TransactionRow';

// KH Brokers P&L line item mapping
// Maps our detailed accounts to their simplified view
const KH_MAPPING = {
  income: {
    'Sales': ['4000', '4030'], // Sales + Shipping Income
    'Discounts': ['4010'],
    'Refunds': ['4020'],
    'Chargebacks': ['4040'],
  },
  cogs: {
    'Product Costs': ['5000', '5030', '5040', '5050'], // COGS, inventory adjustments
    'Shipping & Fulfillment': ['5010', '6010', '6020', '6035'], // Inbound freight, outbound shipping, 3PL, packaging
  },
  expenses: {
    'Google Ads': { accounts: ['6110'], filter: (t: Transaction) => t.name.toLowerCase().includes('google') },
    'Facebook Ads': { accounts: ['6110'], filter: (t: Transaction) => t.name.toLowerCase().includes('facebook') || t.name.toLowerCase().includes('facebk') },
    'Other Paid Ads': { accounts: ['6110'], filter: (t: Transaction) => !t.name.toLowerCase().includes('google') && !t.name.toLowerCase().includes('facebook') && !t.name.toLowerCase().includes('facebk') },
    'Processing Fees': { accounts: ['6055', '6065', '6075'] },
    'Affiliate / Creator Payouts': { accounts: ['6120', '6125'] },
    'Marketing Agencies': { accounts: ['6130'] },
    'Shopify Apps': { accounts: ['6070'] },
    'Marketing Software': { accounts: ['6140'] },
    'Virtual Assistants / Contractors': { accounts: ['6240'] },
    'Other Software': { accounts: ['6375'] },
    'Accounting': { accounts: ['6330'] },
    'Other Expenses': { accounts: ['6100', '6150', '6210', '6250', '6260', '6290', '6300', '6320', '6390', '6410', '6450', '6470', '6495'] },
  }
};

interface LineItem {
  label: string;
  monthlyAmounts: Record<string, number>;
  ytd: number;
  isTotal?: boolean;
  isBold?: boolean;
  indent?: number;
  transactions?: Transaction[];
}

function calculateLineItems(
  transactions: Transaction[],
  tags: Record<string, TransactionTag>,
  months: string[]
): { income: LineItem[]; cogs: LineItem[]; expenses: LineItem[] } {
  // Filter out tagged transactions
  const activeTxns = transactions.filter(t => !tags[t.id]);

  const calcAmounts = (
    accountCodes: string[],
    filter?: (t: Transaction) => boolean
  ): { monthly: Record<string, number>; ytd: number; transactions: Transaction[] } => {
    const monthly: Record<string, number> = {};
    months.forEach(m => { monthly[m] = 0; });
    let ytd = 0;
    const matchedTxns: Transaction[] = [];

    for (const txn of activeTxns) {
      if (accountCodes.includes(txn.accountCode)) {
        if (!filter || filter(txn)) {
          if (monthly[txn.month] !== undefined) {
            monthly[txn.month] += txn.amount;
            ytd += txn.amount;
            matchedTxns.push(txn);
          }
        }
      }
    }

    return { monthly, ytd, transactions: matchedTxns };
  };

  // Income section
  const incomeItems: LineItem[] = [];
  let totalIncomeMonthly: Record<string, number> = {};
  let totalIncomeYtd = 0;
  months.forEach(m => { totalIncomeMonthly[m] = 0; });

  for (const [label, accounts] of Object.entries(KH_MAPPING.income)) {
    const { monthly, ytd, transactions: txns } = calcAmounts(accounts);
    incomeItems.push({ label, monthlyAmounts: monthly, ytd, transactions: txns });
    months.forEach(m => { totalIncomeMonthly[m] += monthly[m]; });
    totalIncomeYtd += ytd;
  }
  incomeItems.push({ label: 'Total Income', monthlyAmounts: totalIncomeMonthly, ytd: totalIncomeYtd, isTotal: true, isBold: true });

  // COGS section
  const cogsItems: LineItem[] = [];
  let totalCogsMonthly: Record<string, number> = {};
  let totalCogsYtd = 0;
  months.forEach(m => { totalCogsMonthly[m] = 0; });

  for (const [label, accounts] of Object.entries(KH_MAPPING.cogs)) {
    const { monthly, ytd, transactions: txns } = calcAmounts(accounts);
    cogsItems.push({ label, monthlyAmounts: monthly, ytd, transactions: txns });
    months.forEach(m => { totalCogsMonthly[m] += monthly[m]; });
    totalCogsYtd += ytd;
  }

  // Gross Profit
  const grossProfitMonthly: Record<string, number> = {};
  months.forEach(m => { grossProfitMonthly[m] = totalIncomeMonthly[m] - totalCogsMonthly[m]; });
  const grossProfitYtd = totalIncomeYtd - totalCogsYtd;
  cogsItems.push({ label: 'Gross Profit', monthlyAmounts: grossProfitMonthly, ytd: grossProfitYtd, isTotal: true, isBold: true });

  // Expenses section
  const expenseItems: LineItem[] = [];
  let totalExpensesMonthly: Record<string, number> = {};
  let totalExpensesYtd = 0;
  months.forEach(m => { totalExpensesMonthly[m] = 0; });

  for (const [label, config] of Object.entries(KH_MAPPING.expenses)) {
    const accounts = 'accounts' in config ? config.accounts : config;
    const filter = 'filter' in config ? config.filter : undefined;
    const { monthly, ytd, transactions: txns } = calcAmounts(accounts as string[], filter as ((t: Transaction) => boolean) | undefined);

    // Only show if there's activity
    if (ytd !== 0) {
      expenseItems.push({ label, monthlyAmounts: monthly, ytd, indent: 1, transactions: txns });
      months.forEach(m => { totalExpensesMonthly[m] += monthly[m]; });
      totalExpensesYtd += ytd;
    }
  }
  expenseItems.push({ label: 'Total Expenses', monthlyAmounts: totalExpensesMonthly, ytd: totalExpensesYtd, isTotal: true, isBold: true });

  // Net Profit
  const netProfitMonthly: Record<string, number> = {};
  months.forEach(m => { netProfitMonthly[m] = grossProfitMonthly[m] - totalExpensesMonthly[m]; });
  const netProfitYtd = grossProfitYtd - totalExpensesYtd;
  expenseItems.push({ label: 'Net Profit', monthlyAmounts: netProfitMonthly, ytd: netProfitYtd, isTotal: true, isBold: true });

  return { income: incomeItems, cogs: cogsItems, expenses: expenseItems };
}

// Group transactions by month
function groupByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};
  for (const txn of transactions) {
    if (!grouped[txn.month]) {
      grouped[txn.month] = [];
    }
    grouped[txn.month].push(txn);
  }
  return grouped;
}

// Expandable line item row component
function KHLineItemRow({
  item,
  months,
  totalColorClass
}: {
  item: LineItem;
  months: string[];
  totalColorClass: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const hasTransactions = item.transactions && item.transactions.length > 0;
  const isExpandable = hasTransactions && !item.isTotal;

  const transactionsByMonth = useMemo(() => {
    if (!item.transactions) return {};
    return groupByMonth(item.transactions);
  }, [item.transactions]);

  const handleToggle = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleMonthToggle = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  return (
    <>
      {/* Main row */}
      <tr
        className={`
          ${item.isTotal ? `${totalColorClass} border-t-2 border-slate-300` : 'border-b border-slate-100'}
          ${isExpandable ? 'cursor-pointer hover:bg-slate-100' : ''}
        `}
        onClick={handleToggle}
      >
        <td className={`sticky left-0 bg-inherit px-3 py-2 text-slate-900 ${item.isBold ? 'font-bold' : ''} ${item.indent ? 'pl-6' : ''}`}>
          <div className="flex items-center gap-2">
            {isExpandable ? (
              <ChevronIcon expanded={isExpanded} className="text-slate-400 flex-shrink-0" />
            ) : (
              <span className="w-4" />
            )}
            <span>{item.label}</span>
          </div>
        </td>
        {months.map(month => (
          <td
            key={month}
            className={`px-3 py-2 text-right font-mono text-sm
              ${item.isBold ? 'font-bold' : ''}
              ${item.monthlyAmounts[month] < 0 ? 'text-red-600' : 'text-slate-900'}
            `}
          >
            {formatCurrency(item.monthlyAmounts[month])}
          </td>
        ))}
        <td
          className={`px-3 py-2 text-right font-mono text-sm bg-slate-100
            ${item.isBold ? 'font-bold' : ''}
            ${item.ytd < 0 ? 'text-red-600' : 'text-slate-900'}
          `}
        >
          {formatCurrency(item.ytd)}
        </td>
      </tr>

      {/* Expanded transaction rows by month */}
      {isExpanded && Object.keys(transactionsByMonth).length > 0 && (
        <>
          {months.filter(m => transactionsByMonth[m]?.length > 0).map(month => {
            const monthTxns = transactionsByMonth[month] || [];
            const monthExpanded = expandedMonths.has(month);

            return (
              <tr key={`${item.label}-${month}-group`} className="bg-slate-50">
                <td
                  colSpan={months.length + 2}
                  className="px-3 py-1 pl-10"
                >
                  <div
                    className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMonthToggle(month);
                    }}
                  >
                    <ChevronIcon expanded={monthExpanded} className="text-slate-400" />
                    <span className="font-medium">{formatMonth(month)}</span>
                    <span className="text-slate-400">({monthTxns.length} transactions)</span>
                    <span className="ml-auto font-mono">
                      {formatCurrency(monthTxns.reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>

                  {/* Individual transactions */}
                  {monthExpanded && (
                    <div className="mt-2 space-y-1 pb-2">
                      {monthTxns.map(txn => (
                        <TransactionRow key={txn.id} transaction={txn} />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
}

export function KHBrokersView() {
  const { state } = usePL();
  const { transactions, months, tags } = state;

  const { income, cogs, expenses } = useMemo(() => {
    if (transactions.length === 0) return { income: [], cogs: [], expenses: [] };
    return calculateLineItems(transactions, tags, months);
  }, [transactions, tags, months]);

  if (transactions.length === 0) return null;

  const renderSection = (title: string, items: LineItem[], colorClass: string, totalColorClass: string) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-1.5 h-6 rounded-full ${colorClass}`} />
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64 z-10">
                Account
              </th>
              {months.map(month => (
                <th key={month} className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28 bg-slate-100">
                YTD Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <KHLineItemRow
                key={idx}
                item={item}
                months={months}
                totalColorClass={totalColorClass}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Extract Gross Profit and Net Profit for separate display
  const grossProfitItem = cogs.find(i => i.label === 'Gross Profit');
  const netProfitItem = expenses.find(i => i.label === 'Net Profit');
  const cogsWithoutGP = cogs.filter(i => i.label !== 'Gross Profit');
  const expensesWithoutNP = expenses.filter(i => i.label !== 'Net Profit');

  const renderProfitRow = (item: LineItem, label: string, bgColor: string, borderColor: string) => {
    if (!item) return null;
    const margin = income[income.length - 1]?.ytd !== 0
      ? (item.ytd / income[income.length - 1].ytd) * 100
      : 0;

    return (
      <div className={`mb-8 overflow-x-auto border ${borderColor} rounded-xl shadow-sm`}>
        <table className="w-full min-w-max">
          <thead>
            <tr className={`${bgColor} border-b ${borderColor}`}>
              <th className="sticky left-0 bg-inherit px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64 z-10">
                &nbsp;
              </th>
              {months.map(month => (
                <th key={month} className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                YTD Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={bgColor}>
              <td className="sticky left-0 bg-inherit px-3 py-3 font-bold text-lg text-slate-900">
                {label}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({margin.toFixed(1)}% margin)
                </span>
              </td>
              {months.map(month => (
                <td
                  key={month}
                  className={`px-3 py-3 text-right font-mono font-bold text-lg
                    ${item.monthlyAmounts[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                  `}
                >
                  {formatCurrency(item.monthlyAmounts[month])}
                </td>
              ))}
              <td
                className={`px-3 py-3 text-right font-mono font-bold text-lg
                  ${item.ytd < 0 ? 'text-red-600' : 'text-slate-900'}
                `}
              >
                {formatCurrency(item.ytd)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {renderSection('Income', income, 'bg-emerald-500', 'bg-emerald-50')}
      {renderSection('Cost of Goods', cogsWithoutGP, 'bg-orange-500', 'bg-orange-50')}
      {renderProfitRow(grossProfitItem!, 'Gross Profit', 'bg-blue-50', 'border-blue-200')}
      {renderSection('Expenses', expensesWithoutNP, 'bg-red-500', 'bg-red-50')}
      {renderProfitRow(netProfitItem!, 'Net Profit', 'bg-green-50', 'border-green-200')}
    </div>
  );
}
