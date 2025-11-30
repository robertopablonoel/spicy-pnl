'use client';

import { useMemo, useState } from 'react';
import { usePL } from '@/context/PLContext';
import { getTaggedTransactionsGrouped } from '@/lib/calculations';
import { formatCurrency } from '@/lib/csvParser';
import { ChevronIcon } from '@/components/ui/ChevronIcon';
import { TransactionRow } from '@/components/pnl/TransactionRow';

export function ExcludedSection() {
  const { state } = usePL();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubAccounts, setExpandedSubAccounts] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    return getTaggedTransactionsGrouped(state.transactions, state.tags);
  }, [state.transactions, state.tags]);

  const hasTaggedItems = Object.keys(grouped.personal).length > 0 ||
    Object.keys(grouped.nonRecurring).length > 0;

  if (!hasTaggedItems) return null;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubAccount = (key: string) => {
    const newExpanded = new Set(expandedSubAccounts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubAccounts(newExpanded);
  };

  const categories = [
    { key: 'personal', label: 'Personal', color: 'bg-purple-500' },
    { key: 'nonRecurring', label: 'Non-Recurring', color: 'bg-orange-500' }
  ] as const;

  return (
    <div className="mt-12 pt-8 border-t-2 border-slate-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded bg-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900">Excluded from P&L</h2>
        <span className="text-sm text-slate-500">
          (Tagged transactions not included in calculations above)
        </span>
      </div>

      <div className="space-y-4">
        {categories.map(({ key, label, color }) => {
          const subAccounts = grouped[key];
          const subAccountKeys = Object.keys(subAccounts);

          if (subAccountKeys.length === 0) return null;

          const isExpanded = expandedCategories.has(key);
          const totalAmount = subAccountKeys.reduce((sum, sa) =>
            sum + subAccounts[sa].reduce((s, t) => s + Math.abs(t.amount), 0), 0
          );
          const totalCount = subAccountKeys.reduce((sum, sa) =>
            sum + subAccounts[sa].length, 0
          );

          return (
            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                onClick={() => toggleCategory(key)}
              >
                <ChevronIcon expanded={isExpanded} className="text-slate-400" />
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="font-semibold text-slate-900">{label}</span>
                <span className="text-sm text-slate-500">
                  ({totalCount} transactions)
                </span>
                <span className="ml-auto font-mono font-semibold text-slate-700">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {/* Sub-accounts */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {subAccountKeys.map(subAccount => {
                    const transactions = subAccounts[subAccount];
                    const saKey = `${key}-${subAccount}`;
                    const saExpanded = expandedSubAccounts.has(saKey);
                    const saTotal = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

                    return (
                      <div key={subAccount}>
                        {/* Sub-account Header */}
                        <div
                          className="flex items-center gap-3 px-6 py-2 bg-white cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleSubAccount(saKey)}
                        >
                          <ChevronIcon expanded={saExpanded} className="text-slate-400" />
                          <span className="text-slate-700">{subAccount}</span>
                          <span className="text-sm text-slate-400">
                            ({transactions.length})
                          </span>
                          <span className="ml-auto font-mono text-slate-600">
                            {formatCurrency(saTotal)}
                          </span>
                        </div>

                        {/* Transactions */}
                        {saExpanded && (
                          <div className="px-8 py-2 bg-slate-50 space-y-1">
                            {transactions.map(txn => (
                              <TransactionRow key={txn.id} transaction={txn} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
