'use client';

import {
  MONTHLY_ACTUALS,
  MONTHLY_PROJECTIONS,
  Q1_2026_TOTALS,
  Q1_2026_NET_MARGIN,
  ANNUALIZED_RUN_RATE,
  formatCurrency,
} from './projectionModel';

// Historical data (Apr 2025 - Nov 2025 actual) + Dec 2025 on track + Projections (Jan-Mar 2026)
const MONTHLY_DATA = [
  // Historical (actual from P&L - rounded for display)
  { month: 'Apr', revenue: Math.round(MONTHLY_ACTUALS.apr25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.apr25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'May', revenue: Math.round(MONTHLY_ACTUALS.may25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.may25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Jun', revenue: Math.round(MONTHLY_ACTUALS.jun25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.jun25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Jul', revenue: Math.round(MONTHLY_ACTUALS.jul25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.jul25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Aug', revenue: Math.round(MONTHLY_ACTUALS.aug25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.aug25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Sep', revenue: Math.round(MONTHLY_ACTUALS.sep25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.sep25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Oct', revenue: Math.round(MONTHLY_ACTUALS.oct25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.oct25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  { month: 'Nov', revenue: Math.round(MONTHLY_ACTUALS.nov25.revenue / 1000) * 1000, dtcRevenue: Math.round(MONTHLY_ACTUALS.nov25.revenue / 1000) * 1000, amazonRevenue: 0, isProjected: false },
  // Dec 2025 - on track (partial actual)
  { month: 'Dec', revenue: MONTHLY_PROJECTIONS.dec25.revenue, dtcRevenue: MONTHLY_PROJECTIONS.dec25.dtcRevenue, amazonRevenue: MONTHLY_PROJECTIONS.dec25.amazonRevenue, isProjected: false, isPartial: true },
  // Projected Q1 2026
  { month: 'Jan', revenue: MONTHLY_PROJECTIONS.jan26.revenue, dtcRevenue: MONTHLY_PROJECTIONS.jan26.dtcRevenue, amazonRevenue: MONTHLY_PROJECTIONS.jan26.amazonRevenue, isProjected: true },
  { month: 'Feb', revenue: MONTHLY_PROJECTIONS.feb26.revenue, dtcRevenue: MONTHLY_PROJECTIONS.feb26.dtcRevenue, amazonRevenue: MONTHLY_PROJECTIONS.feb26.amazonRevenue, isProjected: true },
  { month: 'Mar', revenue: MONTHLY_PROJECTIONS.mar26.revenue, dtcRevenue: MONTHLY_PROJECTIONS.mar26.dtcRevenue, amazonRevenue: MONTHLY_PROJECTIONS.mar26.amazonRevenue, isProjected: true },
];

export function ProjectionsSlide1() {
  const maxRevenue = Math.max(...MONTHLY_DATA.map(m => m.revenue));

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-blue-400 font-medium tracking-wide uppercase text-xs md:text-sm mb-2">
          Growth Projections
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
          Q1 2026: {formatCurrency(Q1_2026_TOTALS.revenue)} Projected Revenue
        </h1>
      </div>

      {/* Bar Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="flex items-end gap-1.5 md:gap-3 h-40 md:h-56">
          {MONTHLY_DATA.map((data, index) => {
            const totalHeight = (data.revenue / maxRevenue) * 100;
            const dtcHeight = (data.dtcRevenue / maxRevenue) * 100;
            const amazonHeight = (data.amazonRevenue / maxRevenue) * 100;
            const isHighlight = data.month === 'Feb' && data.isProjected; // V-Day peak
            const hasAmazon = data.amazonRevenue > 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center h-full">
                {/* Value label - show on hover/highlight or larger screens */}
                <div className={`text-[8px] md:text-xs font-bold mb-1 ${
                  data.isProjected
                    ? isHighlight ? 'text-pink-400' : 'text-blue-400'
                    : 'text-slate-400'
                } ${isHighlight ? '' : 'hidden md:block'}`}>
                  {formatCurrency(data.revenue)}
                </div>

                {/* Stacked Bar */}
                <div className="w-full flex-1 flex flex-col justify-end">
                  {/* Amazon portion (top) */}
                  {hasAmazon && (
                    <div
                      className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t"
                      style={{ height: `${amazonHeight}%` }}
                    />
                  )}
                  {/* DTC portion (bottom) */}
                  <div
                    className={`w-full transition-all duration-500 ${
                      hasAmazon ? '' : 'rounded-t'
                    } ${
                      data.isProjected
                        ? isHighlight
                          ? 'bg-gradient-to-t from-pink-600 to-pink-400'
                          : 'bg-gradient-to-t from-blue-600 to-blue-400'
                        : 'bg-gradient-to-t from-slate-600 to-slate-500'
                    }`}
                    style={{ height: `${Math.max(dtcHeight, 3)}%` }}
                  />
                </div>

                {/* Month label */}
                <div className="mt-1.5 md:mt-2 text-center">
                  <span className={`text-[9px] md:text-xs font-medium ${
                    data.isProjected
                      ? isHighlight ? 'text-pink-400' : 'text-blue-400'
                      : 'text-slate-500'
                  }`}>
                    {data.month}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-3 md:gap-5 mt-3 md:mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-slate-500" />
            <span className="text-[10px] md:text-sm text-slate-400">Historical</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-blue-500" />
            <span className="text-[10px] md:text-sm text-slate-400">DTC</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-orange-500" />
            <span className="text-[10px] md:text-sm text-slate-400">Amazon</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-pink-500" />
            <span className="text-[10px] md:text-sm text-slate-400">V-Day</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-blue-400">
            {formatCurrency(Q1_2026_TOTALS.revenue)}
          </p>
          <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">Q1 2026 Revenue</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-emerald-400">
            {formatCurrency(Q1_2026_TOTALS.netIncome)}
          </p>
          <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">Q1 Net Income</p>
        </div>
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-violet-400">
            {formatCurrency(ANNUALIZED_RUN_RATE)}
          </p>
          <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">Run Rate</p>
        </div>
      </div>

      {/* Callout */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-blue-400 font-semibold">Amazon + Subscription launch in January</span>
          {' '}— DD during Jan-Feb shows real-time proof
        </p>
      </div>
    </div>
  );
}
