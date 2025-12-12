'use client';

import { usePL } from '@/context/PLContext';
import { SummaryCards } from './SummaryCards';
import { PLSection } from './PLSection';
import { ExpensesSection } from './ExpensesSection';
import { GrossProfitRow } from './GrossProfitRow';

interface PLViewerProps {
  allowDrillDown?: boolean;
}

export function PLViewer({ allowDrillDown = true }: PLViewerProps) {
  const { state } = usePL();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading financial data...</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 bg-red-50 px-6 py-4 rounded-lg border border-red-200">
          <strong>Error:</strong> {state.error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <SummaryCards />

      {/* Revenue Section */}
      <PLSection
        section="revenue"
        title="Income"
        colorClass="bg-emerald-500"
        totalColorClass="bg-emerald-50"
        allowDrillDown={allowDrillDown}
      />

      {/* COGS Section */}
      <PLSection
        section="cogs"
        title="Cost of Goods Sold"
        colorClass="bg-orange-500"
        totalColorClass="bg-orange-50"
        allowDrillDown={allowDrillDown}
      />

      {/* Gross Profit */}
      <GrossProfitRow type="grossProfit" />

      {/* Expenses Section (with subcategories) */}
      <ExpensesSection allowDrillDown={allowDrillDown} />

      {/* Net Operating Income */}
      <GrossProfitRow type="netOperatingIncome" />

      {/* Other Income Section */}
      <PLSection
        section="otherIncome"
        title="Other Income"
        colorClass="bg-blue-500"
        totalColorClass="bg-blue-50"
        allowDrillDown={allowDrillDown}
      />

      {/* Other Expenses Section */}
      <PLSection
        section="otherExpenses"
        title="Other Expenses"
        colorClass="bg-slate-500"
        totalColorClass="bg-slate-50"
        allowDrillDown={allowDrillDown}
      />

      {/* Net Income */}
      <GrossProfitRow type="netIncome" />
    </div>
  );
}
