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

export function TeaserSlide2() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  const maxRevenue = Math.max(...data.monthlyData.map(m => m.revenue));
  const ytdRevenue = data.monthlyData.reduce((sum, m) => sum + m.revenue, 0);

  // Calculate growth from first to last month
  const firstMonth = data.monthlyData[0]?.revenue || 0;
  const lastMonth = data.monthlyData[data.monthlyData.length - 1]?.revenue || 0;
  const growthMultiple = firstMonth > 0 ? lastMonth / firstMonth : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Revenue Growth
        </h2>
        <p className="text-slate-400">
          Monthly net revenue trajectory (Jan - Nov 2025)
        </p>
      </div>

      {/* Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
        {/* Bars */}
        <div className="flex items-end gap-2 md:gap-4 h-64 md:h-80">
          {data.monthlyData.map((month, index) => {
            const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
            const isHighlight = index === data.monthlyData.length - 1; // Highlight November

            return (
              <div key={month.month} className="flex-1 flex flex-col items-center h-full">
                {/* Value label */}
                <span className={`text-xs md:text-sm font-mono mb-2 ${isHighlight ? 'text-violet-400' : 'text-slate-400'}`}>
                  {formatCurrency(month.revenue)}
                </span>

                {/* Bar container - takes remaining height */}
                <div className="flex-1 w-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isHighlight
                        ? 'bg-gradient-to-t from-violet-600 to-violet-400'
                        : 'bg-gradient-to-t from-slate-600 to-slate-500'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>

                {/* Month label */}
                <span className={`text-xs font-medium mt-2 ${isHighlight ? 'text-violet-400' : 'text-slate-500'}`}>
                  {MONTH_NAMES[month.month]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-white">
            {formatCurrency(ytdRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">YTD Revenue</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-violet-400">
            {formatCurrency(lastMonth)}
          </p>
          <p className="text-xs text-slate-500 mt-1">November Revenue</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-emerald-400">
            {formatCurrency(data.revenueRunRate)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Annualized Run Rate</p>
        </div>
      </div>

      {/* Callout */}
      <div className="text-center">
        <p className="text-slate-400">
          <span className="text-emerald-400 font-semibold">
            {growthMultiple.toFixed(1)}x growth
          </span>
          {' '}from January to November — no paid ads, no Amazon, no TikTok Shop
        </p>
      </div>
    </div>
  );
}
