'use client';

import { useMemo } from 'react';
import { usePL } from '@/context/PLContext';
import { calculateSectionMonthlyTotal } from '@/lib/calculations';
import { formatCurrency, formatMonth } from '@/lib/csvParser';

interface GrossProfitRowProps {
  type: 'grossProfit' | 'netOperatingIncome' | 'netIncome';
  label?: string;
}

export function GrossProfitRow({ type, label: customLabel }: GrossProfitRowProps) {
  const { state } = usePL();
  const { transactions, accounts, months } = state;

  const calculations = useMemo(() => {
    const revenue: Record<string, number> = {};
    const cogs: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    const otherIncome: Record<string, number> = {};
    const otherExpenses: Record<string, number> = {};

    let revenueYtd = 0, cogsYtd = 0, expensesYtd = 0, otherIncomeYtd = 0, otherExpensesYtd = 0;

    months.forEach(month => {
      revenue[month] = calculateSectionMonthlyTotal('revenue', transactions, accounts, month);
      cogs[month] = calculateSectionMonthlyTotal('cogs', transactions, accounts, month);
      expenses[month] = calculateSectionMonthlyTotal('expenses', transactions, accounts, month);
      otherIncome[month] = calculateSectionMonthlyTotal('otherIncome', transactions, accounts, month);
      otherExpenses[month] = calculateSectionMonthlyTotal('otherExpenses', transactions, accounts, month);

      revenueYtd += revenue[month];
      cogsYtd += cogs[month];
      expensesYtd += expenses[month];
      otherIncomeYtd += otherIncome[month];
      otherExpensesYtd += otherExpenses[month];
    });

    const grossProfit: Record<string, number> = {};
    const netOperatingIncome: Record<string, number> = {};
    const netIncome: Record<string, number> = {};
    let gpYtd = 0, noiYtd = 0, niYtd = 0;

    months.forEach(month => {
      // Gross Profit = Revenue - COGS (matching broker package)
      grossProfit[month] = revenue[month] - cogs[month];
      // Net Operating Income = Gross Profit - Expenses
      netOperatingIncome[month] = grossProfit[month] - expenses[month];
      // Net Income = NOI + Other Income - Other Expenses
      netIncome[month] = netOperatingIncome[month] + otherIncome[month] - otherExpenses[month];

      gpYtd += grossProfit[month];
      noiYtd += netOperatingIncome[month];
      niYtd += netIncome[month];
    });

    return {
      grossProfit: { monthly: grossProfit, ytd: gpYtd },
      netOperatingIncome: { monthly: netOperatingIncome, ytd: noiYtd },
      netIncome: { monthly: netIncome, ytd: niYtd },
      revenue: { monthly: revenue, ytd: revenueYtd }
    };
  }, [transactions, accounts, months]);

  if (transactions.length === 0) return null;

  let data: { monthly: Record<string, number>; ytd: number };
  let label: string;
  let bgColor: string;
  let borderColor: string;

  switch (type) {
    case 'grossProfit':
      data = calculations.grossProfit;
      label = customLabel || 'Gross Profit';
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-200';
      break;
    case 'netOperatingIncome':
      data = calculations.netOperatingIncome;
      label = customLabel || 'Net Operating Income';
      bgColor = 'bg-amber-50';
      borderColor = 'border-amber-200';
      break;
    case 'netIncome':
      data = calculations.netIncome;
      label = customLabel || 'Net Income';
      bgColor = 'bg-green-50';
      borderColor = 'border-green-200';
      break;
  }

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
