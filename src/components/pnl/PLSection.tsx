'use client';

import { useMemo } from 'react';
import { PLSection as PLSectionType, PLRow as PLRowType } from '@/types';
import { usePL } from '@/context/PLContext';
import { buildPLRows, calculateSectionMonthlyTotal } from '@/lib/calculations';
import { formatCurrency, formatMonth } from '@/lib/csvParser';
import { PLRow } from './PLRow';

interface PLSectionProps {
  section: PLSectionType;
  title: string;
  colorClass: string;
  totalColorClass?: string;
}

export function PLSection({ section, title, colorClass, totalColorClass }: PLSectionProps) {
  const { state } = usePL();
  const { transactions, accounts, months, tags } = state;

  const rows = useMemo(() => {
    if (transactions.length === 0) return [];
    return buildPLRows(section, transactions, accounts, months, tags);
  }, [section, transactions, accounts, months, tags]);

  const sectionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let ytd = 0;

    months.forEach(month => {
      const total = calculateSectionMonthlyTotal(section, transactions, accounts, month, tags);
      totals[month] = total;
      ytd += total;
    });

    return { monthly: totals, ytd };
  }, [section, transactions, accounts, months, tags]);

  if (rows.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className={`flex items-center gap-3 mb-2`}>
        <div className={`w-1 h-6 rounded ${colorClass}`} />
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28 bg-slate-100">
                YTD Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <PLRow key={row.accountCode} row={row} months={months} />
            ))}

            {/* Section Total Row */}
            <tr className={`${totalColorClass || 'bg-slate-50'} border-t-2 border-slate-300`}>
              <td className="sticky left-0 bg-inherit px-3 py-2 font-bold text-slate-900">
                Total {title}
              </td>
              {months.map(month => (
                <td
                  key={month}
                  className={`px-3 py-2 text-right font-mono text-sm font-bold
                    ${sectionTotals.monthly[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                  `}
                >
                  {formatCurrency(sectionTotals.monthly[month])}
                </td>
              ))}
              <td
                className={`px-3 py-2 text-right font-mono text-sm font-bold bg-slate-100
                  ${sectionTotals.ytd < 0 ? 'text-red-600' : 'text-slate-900'}
                `}
              >
                {formatCurrency(sectionTotals.ytd)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
