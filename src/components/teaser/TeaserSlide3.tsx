'use client';

import { useTeaserData } from './TeaserDataProvider';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Profit Engine
        </h2>
        <p className="text-slate-400">
          Strong unit economics with expanding margins
        </p>
      </div>

      {/* Dual Chart - Gross Profit & Net Income */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="flex items-end gap-2 md:gap-4 h-64 md:h-72">
          {data.monthlyData.map((month, index) => {
            const gpHeight = maxGP > 0 ? (month.grossProfit / maxGP) * 100 : 0;
            const netHeight = maxGP > 0 ? (Math.max(month.netIncome, 0) / maxGP) * 100 : 0;
            const isHighlight = index === data.monthlyData.length - 1;

            return (
              <div key={month.month} className="flex-1 flex flex-col items-center h-full">
                {/* Bar container - takes full height */}
                <div className="w-full flex-1 flex items-end justify-center gap-0.5">
                  {/* Gross Profit bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all duration-500 ${
                      isHighlight
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-t from-emerald-700 to-emerald-600'
                    }`}
                    style={{ height: `${Math.max(gpHeight, 2)}%` }}
                    title={`GP: ${formatCurrency(month.grossProfit)}`}
                  />
                  {/* Net Income bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all duration-500 ${
                      isHighlight
                        ? 'bg-gradient-to-t from-violet-600 to-violet-400'
                        : 'bg-gradient-to-t from-violet-700 to-violet-600'
                    }`}
                    style={{ height: `${Math.max(netHeight, 2)}%` }}
                    title={`Net: ${formatCurrency(month.netIncome)}`}
                  />
                </div>

                {/* Month label */}
                <span className={`text-xs font-medium mt-2 ${isHighlight ? 'text-white' : 'text-slate-500'}`}>
                  {MONTH_NAMES[month.month]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-sm text-slate-400">Gross Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-violet-500" />
            <span className="text-sm text-slate-400">Net Income / EBITDA</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-emerald-400">
            {formatCurrency(ytdGrossProfit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">YTD Gross Profit</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-emerald-400">
            {gpMargin.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Gross Margin</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-violet-400">
            {formatCurrency(ytdNetIncome)}
          </p>
          <p className="text-xs text-slate-500 mt-1">YTD EBITDA</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-violet-400">
            {netMargin.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">EBITDA Margin</p>
        </div>
      </div>

      {/* Callout */}
      <div className="text-center">
        <p className="text-slate-400">
          <span className="text-emerald-400 font-semibold">
            {formatCurrency(data.ebitdaRunRate)} annualized run rate
          </span>
          {' '}— high-margin, capital-light business model
        </p>
      </div>
    </div>
  );
}
