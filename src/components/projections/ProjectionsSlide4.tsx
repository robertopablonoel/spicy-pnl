'use client';

import {
  ACTUAL_TTM,
  MONTHLY_ACTUALS,
  MONTHLY_PROJECTIONS,
  Q1_2026_TOTALS,
  FORWARD_SDE,
  ANNUALIZED_RUN_RATE,
  formatCurrency,
} from './projectionModel';

// Rolling off months (Dec 24 - Mar 25)
const ROLLING_OFF_TOTAL =
  MONTHLY_ACTUALS.dec24.netIncome +
  MONTHLY_ACTUALS.jan25.netIncome +
  MONTHLY_ACTUALS.feb25.netIncome +
  MONTHLY_ACTUALS.mar25.netIncome;

// Build the bridge with actual calculated values
const SDE_BRIDGE = [
  {
    label: 'TTM SDE (Dec 24 - Nov 25)',
    value: ACTUAL_TTM.netIncome,
    description: 'Actual trailing twelve months from P&L',
    type: 'base',
  },
  {
    label: 'Dec 2025 (on track)',
    value: MONTHLY_PROJECTIONS.dec25.netIncome,
    description: `${formatCurrency(MONTHLY_PROJECTIONS.dec25.revenue)} rev`,
    type: 'add',
  },
  {
    label: 'Jan 2026 (Amazon launch)',
    value: MONTHLY_PROJECTIONS.jan26.netIncome,
    description: `${formatCurrency(MONTHLY_PROJECTIONS.jan26.revenue)} rev`,
    type: 'add',
  },
  {
    label: 'Feb 2026 (V-Day + Amazon)',
    value: MONTHLY_PROJECTIONS.feb26.netIncome,
    description: `${formatCurrency(MONTHLY_PROJECTIONS.feb26.revenue)} rev`,
    type: 'add',
  },
  {
    label: 'Mar 2026 (normalized)',
    value: MONTHLY_PROJECTIONS.mar26.netIncome,
    description: `${formatCurrency(MONTHLY_PROJECTIONS.mar26.revenue)} rev`,
    type: 'add',
  },
  {
    label: 'Less: Dec 24 - Mar 25',
    value: -ROLLING_OFF_TOTAL,
    description: 'Rolling off TTM window',
    type: 'subtract',
  },
];

export function ProjectionsSlide4() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-blue-400 font-medium tracking-wide uppercase text-xs md:text-sm mb-2">
          Path to Forward SDE
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
          {formatCurrency(FORWARD_SDE)} Forward SDE
        </h2>
        <p className="text-sm md:text-base text-slate-400 mt-2">
          Rolling 12-month basis through Mar 2026
        </p>
      </div>

      {/* Bridge Calculation */}
      <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="space-y-2 md:space-y-3">
          {SDE_BRIDGE.map((item, index) => {
            const isBase = item.type === 'base';
            const isSubtract = item.type === 'subtract';

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${
                  isBase
                    ? 'bg-slate-700/50'
                    : isSubtract
                    ? 'bg-red-500/10'
                    : 'bg-emerald-500/10'
                }`}
              >
                <div className="flex-1">
                  <p className={`text-sm md:text-base font-medium ${
                    isBase ? 'text-white' : isSubtract ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] md:text-xs text-slate-500">{item.description}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base md:text-xl font-bold ${
                    isBase ? 'text-white' : isSubtract ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {isSubtract ? '' : '+'}{formatCurrency(item.value)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-blue-500/20 border border-blue-500/30 mt-2">
            <div>
              <p className="text-base md:text-lg font-bold text-white">Forward SDE (Apr 25 - Mar 26)</p>
              <p className="text-[10px] md:text-xs text-slate-400">Rolling 12-month basis</p>
            </div>
            <p className="text-xl md:text-3xl font-bold text-blue-400">{formatCurrency(FORWARD_SDE)}</p>
          </div>
        </div>
      </div>

      {/* Annualized View */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-white">{formatCurrency(Q1_2026_TOTALS.netIncome)}</p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">Q1 2026 SDE</p>
        </div>
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-violet-400">{formatCurrency(ANNUALIZED_RUN_RATE)}</p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">Annualized Run Rate</p>
        </div>
      </div>

      {/* Key Insight */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-blue-400 font-semibold">DD during Jan-Feb validates projections in real-time</span>
          {' '}— forward SDE becomes provable
        </p>
      </div>
    </div>
  );
}
