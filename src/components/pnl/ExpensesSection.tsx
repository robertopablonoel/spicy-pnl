'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { buildExpenseSubcategoryRows, calculateExpenseSubcategoryTotal, calculateTotalExpenses } from '@/lib/calculations';
import { formatCurrency, formatMonth } from '@/lib/csvParser';
import { PLRow } from './PLRow';
import { ExpenseSubcategory } from '@/types';

interface ExpensesSectionProps {
  allowDrillDown?: boolean;
}

interface SubcategoryConfig {
  subcategory: ExpenseSubcategory;
  title: string;
  code: string;
}

const SUBCATEGORIES: SubcategoryConfig[] = [
  { subcategory: 'costOfSales', title: '6000 Cost of Sales', code: '6000' },
  { subcategory: 'advertising', title: '6100 Advertising & Marketing', code: '6100' },
];

export function ExpensesSection({ allowDrillDown = true }: ExpensesSectionProps) {
  const { state } = usePL();
  const { transactions, accounts, months } = state;

  // Build rows for each subcategory
  const subcategoryData = useMemo(() => {
    if (transactions.length === 0) return [];

    return SUBCATEGORIES.map(config => {
      const rows = buildExpenseSubcategoryRows(config.subcategory, transactions, accounts, months);
      const totals = calculateExpenseSubcategoryTotal(config.subcategory, transactions, accounts, months);
      return { ...config, rows, totals };
    }).filter(data => data.rows.length > 0);
  }, [transactions, accounts, months]);

  // Build rows for "other" expenses (6200+)
  const otherExpenseRows = useMemo(() => {
    if (transactions.length === 0) return [];
    return buildExpenseSubcategoryRows('other', transactions, accounts, months);
  }, [transactions, accounts, months]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return calculateTotalExpenses(transactions, months);
  }, [transactions, months]);

  const hasAnyExpenses = subcategoryData.length > 0 || otherExpenseRows.length > 0;

  if (!hasAnyExpenses) return null;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1.5 h-6 rounded-full bg-red-500" />
        <h2 className="text-lg font-semibold text-slate-800">Expenses</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64 z-10">
                Account
              </th>
              {months.map(month => (
                <th
                  key={month}
                  className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24"
                >
                  {formatMonth(month)}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-violet-700 uppercase tracking-wider w-28 bg-violet-100 border-l-2 border-violet-200">
                YTD Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Subcategories with headers */}
            {subcategoryData.map(({ subcategory, title, rows, totals }) => (
              <SubcategoryGroup
                key={subcategory}
                title={title}
                rows={rows}
                totals={totals}
                months={months}
                allowDrillDown={allowDrillDown}
              />
            ))}

            {/* Other expenses (no subcategory header) */}
            {otherExpenseRows.map(row => (
              <PLRow key={row.accountCode} row={row} months={months} allowDrillDown={allowDrillDown} />
            ))}

            {/* Total Expenses Row */}
            <tr className="bg-red-50 border-t-2 border-slate-300">
              <td className="sticky left-0 bg-inherit px-3 py-2 font-bold text-slate-900">
                Total Expenses
              </td>
              {months.map(month => (
                <td
                  key={month}
                  className={`px-3 py-2 text-right font-mono text-sm font-bold
                    ${totalExpenses.monthly[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                  `}
                >
                  {formatCurrency(totalExpenses.monthly[month])}
                </td>
              ))}
              <td
                className={`px-3 py-2 text-right font-mono text-sm font-bold bg-violet-100 border-l-2 border-violet-200
                  ${totalExpenses.ytd < 0 ? 'text-red-600' : 'text-violet-900'}
                `}
              >
                {formatCurrency(totalExpenses.ytd)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SubcategoryGroupProps {
  title: string;
  rows: ReturnType<typeof buildExpenseSubcategoryRows>;
  totals: { monthly: Record<string, number>; ytd: number };
  months: string[];
  allowDrillDown: boolean;
}

function SubcategoryGroup({ title, rows, totals, months, allowDrillDown }: SubcategoryGroupProps) {
  return (
    <>
      {/* Subcategory Header */}
      <tr className="bg-slate-100/50">
        <td
          colSpan={months.length + 2}
          className="sticky left-0 bg-slate-100/50 px-3 py-2 font-semibold text-slate-700 text-sm"
        >
          {title}
        </td>
      </tr>

      {/* Subcategory Accounts */}
      {rows.map(row => (
        <PLRow
          key={row.accountCode}
          row={row}
          months={months}
          allowDrillDown={allowDrillDown}
          isChild
        />
      ))}

      {/* Subcategory Total */}
      <tr className="bg-slate-50 border-b border-slate-200">
        <td className="sticky left-0 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 pl-6">
          Total {title}
        </td>
        {months.map(month => (
          <td
            key={month}
            className={`px-3 py-1.5 text-right font-mono text-sm font-semibold
              ${totals.monthly[month] < 0 ? 'text-red-600' : 'text-slate-700'}
            `}
          >
            {formatCurrency(totals.monthly[month])}
          </td>
        ))}
        <td
          className={`px-3 py-1.5 text-right font-mono text-sm font-semibold bg-violet-50 border-l-2 border-violet-200
            ${totals.ytd < 0 ? 'text-red-600' : 'text-violet-800'}
          `}
        >
          {formatCurrency(totals.ytd)}
        </td>
      </tr>
    </>
  );
}
