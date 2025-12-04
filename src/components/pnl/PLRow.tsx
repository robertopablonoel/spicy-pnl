'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { PLRow as PLRowType, Transaction } from '@/types';
import { ChevronIcon } from '@/components/ui/ChevronIcon';
import { formatCurrency, formatMonth } from '@/lib/csvParser';
import { getAccountTransactions, groupTransactionsByMonth, calculateMonthlyAmounts } from '@/lib/calculations';
import { TransactionRow } from './TransactionRow';

interface PLRowProps {
  row: PLRowType;
  months: string[];
  depth?: number;
  isChild?: boolean;
}

export function PLRow({ row, months, depth = 0, isChild = false }: PLRowProps) {
  const { state, dispatch } = usePL();
  const { expandedAccounts, expandedMonths, transactions, accounts, tags } = state;

  const isExpanded = expandedAccounts.has(row.accountCode);
  const hasChildren = row.account.children.length > 0;
  const hasTransactions = row.transactionCount > 0;
  const isExpandable = hasChildren || hasTransactions;

  // Get child rows if expanded
  const childRows = useMemo(() => {
    if (!isExpanded || !hasChildren) return [];

    return row.account.children
      .map(childCode => {
        const childAccount = accounts.get(childCode);
        if (!childAccount) return null;

        const { monthlyAmounts, ytdTotal, transactionCount } = calculateMonthlyAmounts(
          childCode, transactions, accounts, months, tags
        );

        if (ytdTotal === 0 && transactionCount === 0) return null;

        return {
          accountCode: childCode,
          account: childAccount,
          monthlyAmounts,
          ytdTotal,
          transactionCount
        } as PLRowType;
      })
      .filter((r): r is PLRowType => r !== null);
  }, [isExpanded, hasChildren, row.account.children, accounts, transactions, months, tags]);

  // Get transactions grouped by month if expanded (only for leaf nodes)
  const transactionsByMonth = useMemo(() => {
    if (!isExpanded || hasChildren) return {};

    const txns = getAccountTransactions(row.accountCode, transactions, accounts, tags);
    return groupTransactionsByMonth(txns);
  }, [isExpanded, hasChildren, row.accountCode, transactions, accounts, tags]);

  const handleToggle = () => {
    if (isExpandable) {
      dispatch({ type: 'TOGGLE_ACCOUNT', payload: row.accountCode });
    }
  };

  const handleMonthToggle = (month: string) => {
    const key = `${row.accountCode}-${month}`;
    dispatch({ type: 'TOGGLE_MONTH', payload: key });
  };

  const isMonthExpanded = (month: string) => {
    return expandedMonths.has(`${row.accountCode}-${month}`);
  };

  const indentPadding = depth * 20;

  return (
    <>
      {/* Main account row */}
      <tr
        className={`
          ${isChild ? 'bg-slate-50/50' : 'bg-white'}
          ${isExpandable ? 'cursor-pointer hover:bg-slate-100' : ''}
          border-b border-slate-100
        `}
        onClick={handleToggle}
      >
        {/* Account name column */}
        <td
          className="sticky left-0 bg-inherit px-3 py-2 font-medium text-slate-900 whitespace-nowrap z-10"
          style={{ paddingLeft: `${12 + indentPadding}px` }}
        >
          <div className="flex items-center gap-2">
            {isExpandable ? (
              <ChevronIcon expanded={isExpanded} className="text-slate-400 flex-shrink-0" />
            ) : (
              <span className="w-4" />
            )}
            <span className={depth > 0 ? 'text-sm' : ''}>
              {row.account.name}
            </span>
          </div>
        </td>

        {/* Monthly amounts */}
        {months.map(month => (
          <td
            key={month}
            className={`px-3 py-2 text-right font-mono text-sm whitespace-nowrap
              ${row.monthlyAmounts[month] < 0 ? 'text-red-600' : 'text-slate-700'}
            `}
          >
            {row.monthlyAmounts[month] !== 0 ? formatCurrency(row.monthlyAmounts[month]) : '-'}
          </td>
        ))}

        {/* YTD Total */}
        <td
          className={`px-3 py-2 text-right font-mono text-sm font-semibold whitespace-nowrap bg-violet-50 border-l-2 border-violet-200
            ${row.ytdTotal < 0 ? 'text-red-600' : 'text-violet-900'}
          `}
        >
          {formatCurrency(row.ytdTotal)}
        </td>
      </tr>

      {/* Child account rows */}
      {isExpanded && childRows.map(childRow => (
        <PLRow
          key={childRow.accountCode}
          row={childRow}
          months={months}
          depth={depth + 1}
          isChild
        />
      ))}

      {/* Transaction month groups (for leaf nodes) */}
      {isExpanded && !hasChildren && Object.keys(transactionsByMonth).length > 0 && (
        <>
          {months.filter(m => transactionsByMonth[m]?.length > 0).map(month => {
            const monthTxns = transactionsByMonth[month] || [];
            const monthExpanded = isMonthExpanded(month);

            return (
              <tr key={`${row.accountCode}-${month}-group`} className="bg-slate-50">
                <td
                  colSpan={months.length + 2}
                  className="px-3 py-1"
                  style={{ paddingLeft: `${32 + indentPadding}px` }}
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
