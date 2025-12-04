'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { formatCurrency } from '@/lib/csvParser';
import { Transaction, TransactionTag } from '@/types';

// Same KH mapping as KHBrokersView for consistency
const KH_INCOME_ACCOUNTS = ['4000', '4030', '4010', '4020', '4040'];
const KH_COGS_ACCOUNTS = ['5000', '5030', '5040', '5050', '5010', '6010', '6020', '6035'];
const KH_EXPENSE_ACCOUNTS = ['6055', '6065', '6070', '6075', '6100', '6110', '6120', '6125', '6130', '6140', '6150', '6210', '6240', '6250', '6260', '6290', '6300', '6320', '6330', '6375', '6390', '6410', '6450', '6470', '6495'];

function calculateKHSummary(
  transactions: Transaction[],
  tags: Record<string, TransactionTag>,
  months: string[]
) {
  const activeTxns = transactions.filter(t => !tags[t.id] && months.includes(t.month));

  const sumAccounts = (accounts: string[]) =>
    activeTxns
      .filter(t => accounts.includes(t.accountCode))
      .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = sumAccounts(KH_INCOME_ACCOUNTS);
  const totalCogs = sumAccounts(KH_COGS_ACCOUNTS);
  const totalExpenses = sumAccounts(KH_EXPENSE_ACCOUNTS);

  const grossProfit = totalIncome - totalCogs;
  const netIncome = grossProfit - totalExpenses;
  const netMargin = totalIncome !== 0 ? (netIncome / totalIncome) * 100 : 0;

  return {
    netRevenue: totalIncome,
    netIncome,
    netMargin
  };
}

export function SummaryCards() {
  const { state } = usePL();

  const summary = useMemo(() => {
    if (state.transactions.length === 0) return null;
    return calculateKHSummary(state.transactions, state.tags, state.months);
  }, [state.transactions, state.tags, state.months]);

  if (!summary) return null;

  const cards = [
    {
      label: 'Net Revenue',
      value: summary.netRevenue,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      valueColor: 'text-blue-900'
    },
    {
      label: 'Net Income',
      value: summary.netIncome,
      subLabel: `${summary.netMargin.toFixed(1)}% margin`,
      color: summary.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
      textColor: summary.netIncome >= 0 ? 'text-green-700' : 'text-red-700',
      valueColor: summary.netIncome >= 0 ? 'text-green-900' : 'text-red-900'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} border rounded-xl p-3 md:p-5 shadow-sm transition-shadow hover:shadow-md`}
        >
          <div className={`text-xs md:text-sm font-medium ${card.textColor} uppercase tracking-wide`}>
            {card.label}
          </div>
          <div className={`text-xl md:text-3xl font-bold ${card.valueColor} mt-1 md:mt-2 font-mono`}>
            {formatCurrency(card.value)}
          </div>
          {card.subLabel && (
            <div className={`text-xs md:text-sm ${card.textColor} mt-1 md:mt-2 opacity-80`}>
              {card.subLabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
