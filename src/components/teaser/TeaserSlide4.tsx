'use client';

import { useTeaserData } from './TeaserDataProvider';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function TeaserSlide4() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  const ytdRevenue = data.monthlyData.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          The Content Machine
        </h2>
        <p className="text-slate-400">
          Creator-powered organic reach that converts
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {/* Step 1: Views */}
          <div className="flex-1 text-center">
            <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 flex items-center justify-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-pink-400">70M</p>
                <p className="text-xs text-slate-400">views/mo</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-3">Organic Reach</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:block">
            <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="md:hidden">
            <svg className="w-8 h-8 text-slate-600 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Step 2: Creators */}
          <div className="flex-1 text-center">
            <div className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-violet-400">35</p>
                <p className="text-xs text-slate-400">creators</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-3">Managed Network</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:block">
            <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="md:hidden">
            <svg className="w-8 h-8 text-slate-600 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Step 3: Revenue */}
          <div className="flex-1 text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-emerald-400">{formatCurrency(ytdRevenue)}</p>
                <p className="text-xs text-slate-400">YTD</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-3">Net Revenue</p>
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-pink-400">
            {data.affiliateROAS.toFixed(1)}x
          </p>
          <p className="text-xs text-slate-500 mt-1">Creator ROAS</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-violet-400">
            $1
          </p>
          <p className="text-xs text-slate-500 mt-1">CPM (cost per 1K views)</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-blue-400">
            0
          </p>
          <p className="text-xs text-slate-500 mt-1">Paid Ad Spend</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-emerald-400">
            {formatCurrency(data.totalAffiliateSpend)}
          </p>
          <p className="text-xs text-slate-500 mt-1">YTD Creator Spend</p>
        </div>
      </div>

      {/* Moat Description */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl p-4">
          <p className="text-violet-400 font-semibold text-sm mb-1">Proprietary Software</p>
          <p className="text-slate-400 text-xs">Custom creator management platform for tracking, communication, and payments</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl p-4">
          <p className="text-pink-400 font-semibold text-sm mb-1">Retainer + Commission</p>
          <p className="text-slate-400 text-xs">Hybrid model aligns incentives and ensures consistent content output</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold text-sm mb-1">Compounding Flywheel</p>
          <p className="text-slate-400 text-xs">Views drive revenue, revenue funds creators, creators drive views</p>
        </div>
      </div>
    </div>
  );
}
