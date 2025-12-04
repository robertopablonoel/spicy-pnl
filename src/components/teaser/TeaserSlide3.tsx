'use client';

import { useTeaserData } from './TeaserDataProvider';

function getMonthLabel(month: string): string {
  const monthNum = month.split('-')[1]; // "2025-01" -> "01"
  const names: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  };
  return names[monthNum] || month;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function TeaserSlide3() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  const ytdGrossProfit = data.monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
  const ytdNetIncome = data.monthlyData.reduce((sum, m) => sum + m.netIncome, 0);
  const ytdRevenue = data.monthlyData.reduce((sum, m) => sum + m.revenue, 0);

  // Calculate margins
  const gpMargin = ytdRevenue > 0 ? (ytdGrossProfit / ytdRevenue) * 100 : 0;
  const netMargin = ytdRevenue > 0 ? (ytdNetIncome / ytdRevenue) * 100 : 0;

  // Get max for chart scaling
  const maxGP = Math.max(...data.monthlyData.map(m => m.grossProfit));

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
          Profit Engine
        </h2>
        <p className="text-sm md:text-base text-slate-400">
          Strong unit economics with expanding margins
        </p>
      </div>

      {/* Dual Chart - Gross Profit & Net Income */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8">
        <div className="flex items-end gap-1 md:gap-4 h-36 md:h-72">
          {data.monthlyData.map((month, index) => {
            const gpHeight = maxGP > 0 ? (month.grossProfit / maxGP) * 100 : 0;
            const netHeight = maxGP > 0 ? (Math.max(month.netIncome, 0) / maxGP) * 100 : 0;
            const isHighlight = index === data.monthlyData.length - 1;

            return (
              <div key={month.month} className="flex-1 flex flex-col items-center h-full">
                {/* Value labels - show on desktop, only highlighted on mobile */}
                <div className={`text-[6px] md:text-xs font-mono mb-1 flex gap-0.5 md:gap-1 ${isHighlight ? '' : 'hidden md:flex'}`}>
                  <span className="text-emerald-400">{formatCurrency(month.grossProfit)}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-violet-400">{formatCurrency(month.netIncome)}</span>
                </div>

                {/* Bar container */}
                <div className="w-full flex-1 flex items-end justify-center gap-px md:gap-0.5">
                  {/* Gross Profit bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all duration-500 ${
                      isHighlight
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-t from-emerald-700 to-emerald-600'
                    }`}
                    style={{ height: `${Math.max(gpHeight, 2)}%` }}
                  />
                  {/* Net Income bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all duration-500 ${
                      isHighlight
                        ? 'bg-gradient-to-t from-violet-600 to-violet-400'
                        : 'bg-gradient-to-t from-violet-700 to-violet-600'
                    }`}
                    style={{ height: `${Math.max(netHeight, 2)}%` }}
                  />
                </div>

                {/* Month label */}
                <span className={`text-[8px] md:text-xs font-medium mt-1 md:mt-2 ${isHighlight ? 'text-white' : 'text-slate-500'}`}>
                  {getMonthLabel(month.month)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 md:gap-6 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded bg-emerald-500" />
            <span className="text-[10px] md:text-sm text-slate-400">Gross Profit</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded bg-violet-500" />
            <span className="text-[10px] md:text-sm text-slate-400">EBITDA</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-emerald-400">
            {formatCurrency(ytdGrossProfit)}
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">YTD Gross Profit</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-emerald-400">
            {gpMargin.toFixed(0)}%
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Gross Margin</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-violet-400">
            {formatCurrency(ytdNetIncome)}
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">YTD EBITDA</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-violet-400">
            {netMargin.toFixed(0)}%
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">EBITDA Margin</p>
        </div>
      </div>

      {/* Callout */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-emerald-400 font-semibold">
            {formatCurrency(data.ebitdaRunRate)} run rate
          </span>
          {' '}— high-margin, capital-light model
        </p>
      </div>
    </div>
  );
}
