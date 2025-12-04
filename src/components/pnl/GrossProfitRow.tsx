'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { calculateSectionMonthlyTotal } from '@/lib/calculations';
import { formatCurrency, formatMonth } from '@/lib/csvParser';

interface GrossProfitRowProps {
  type: 'grossProfit' | 'netIncome';
}

export function GrossProfitRow({ type }: GrossProfitRowProps) {
  const { state } = usePL();
  const { transactions, accounts, months, tags } = state;

  const calculations = useMemo(() => {
    const revenue: Record<string, number> = {};
    const cogs: Record<string, number> = {};
    const costOfSales: Record<string, number> = {};
    const opex: Record<string, number> = {};
    const other: Record<string, number> = {};

    let revenueYtd = 0, cogsYtd = 0, cosYtd = 0, opexYtd = 0, otherYtd = 0;

    months.forEach(month => {
      revenue[month] = calculateSectionMonthlyTotal('revenue', transactions, accounts, month, tags);
      cogs[month] = calculateSectionMonthlyTotal('cogs', transactions, accounts, month, tags);
      costOfSales[month] = calculateSectionMonthlyTotal('costOfSales', transactions, accounts, month, tags);
      opex[month] = calculateSectionMonthlyTotal('operatingExpenses', transactions, accounts, month, tags);
      other[month] = calculateSectionMonthlyTotal('otherIncome', transactions, accounts, month, tags);

      revenueYtd += revenue[month];
      cogsYtd += cogs[month];
      cosYtd += costOfSales[month];
      opexYtd += opex[month];
      otherYtd += other[month];
    });

    const grossProfit: Record<string, number> = {};
    const netIncome: Record<string, number> = {};
    let gpYtd = 0, niYtd = 0;

    months.forEach(month => {
      grossProfit[month] = revenue[month] - cogs[month] - costOfSales[month];
      netIncome[month] = grossProfit[month] - opex[month] + other[month];
      gpYtd += grossProfit[month];
      niYtd += netIncome[month];
    });

    return {
      grossProfit: { monthly: grossProfit, ytd: gpYtd },
      netIncome: { monthly: netIncome, ytd: niYtd },
      revenue: { monthly: revenue, ytd: revenueYtd }
    };
  }, [transactions, accounts, months, tags]);

  if (transactions.length === 0) return null;

  const data = type === 'grossProfit' ? calculations.grossProfit : calculations.netIncome;
  const label = type === 'grossProfit' ? 'Gross Profit' : 'Net Income';
  const bgColor = type === 'grossProfit' ? 'bg-blue-50' : 'bg-green-50';
  const borderColor = type === 'grossProfit' ? 'border-blue-200' : 'border-green-200';

  // Calculate margin
  const margin = calculations.revenue.ytd !== 0
    ? (data.ytd / calculations.revenue.ytd) * 100
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
                  ${data.monthly[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                `}
              >
                {formatCurrency(data.monthly[month])}
              </td>
            ))}
            <td
              className={`px-3 py-3 text-right font-mono font-bold text-lg bg-violet-100 border-l-2 border-violet-200
                ${data.ytd < 0 ? 'text-red-600' : 'text-violet-900'}
              `}
            >
              {formatCurrency(data.ytd)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
