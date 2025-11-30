'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { calculatePLSummary } from '@/lib/calculations';
import { formatCurrency } from '@/lib/csvParser';

export function SummaryCards() {
  const { state } = usePL();

  const summary = useMemo(() => {
    if (state.transactions.length === 0) return null;
    return calculatePLSummary(state.transactions, state.accounts, state.tags);
  }, [state.transactions, state.accounts, state.tags]);

  if (!summary) return null;

  const cards = [
    {
      label: 'Net Revenue',
      value: summary.netRevenue,
      color: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-700',
      valueColor: 'text-emerald-900'
    },
    {
      label: 'Gross Profit',
      value: summary.grossProfit,
      subLabel: `${summary.grossMargin.toFixed(1)}% margin`,
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
    },
    {
      label: 'Tagged Items',
      value: summary.taggedAmount,
      subLabel: `${summary.taggedItemsCount} transactions`,
      color: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-700',
      valueColor: 'text-amber-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} border rounded-lg p-4 shadow-sm`}
        >
          <div className={`text-sm font-medium ${card.textColor}`}>
            {card.label}
          </div>
          <div className={`text-2xl font-bold ${card.valueColor} mt-1`}>
            {formatCurrency(card.value)}
          </div>
          {card.subLabel && (
            <div className={`text-xs ${card.textColor} mt-1 opacity-75`}>
              {card.subLabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
