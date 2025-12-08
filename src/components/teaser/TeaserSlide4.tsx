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
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
          Proprietary Creator Engine
        </h2>
        <p className="text-sm md:text-base text-slate-400">
          Custom software automates recruiting, management, and tracking
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8">
          {/* Step 1: Views */}
          <div className="flex-1 text-center">
            <div className="w-20 h-20 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 flex items-center justify-center">
              <div>
                <p className="text-xl md:text-4xl font-bold text-pink-400">70M</p>
                <p className="text-[10px] md:text-xs text-slate-400">views/mo</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3">Organic Reach</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:block">
            <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="md:hidden">
            <svg className="w-5 h-5 text-slate-600 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Step 2: Creators */}
          <div className="flex-1 text-center">
            <div className="w-18 h-18 md:w-36 md:h-36 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center" style={{ width: '4.5rem', height: '4.5rem' }}>
              <div>
                <p className="text-xl md:text-4xl font-bold text-violet-400">35</p>
                <p className="text-[10px] md:text-xs text-slate-400">creators</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3">Managed Network</p>
          </div>

          {/* Arrow */}
          <div className="hidden md:block">
            <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="md:hidden">
            <svg className="w-5 h-5 text-slate-600 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Step 3: Revenue */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <div>
                <p className="text-base md:text-3xl font-bold text-emerald-400">{formatCurrency(ytdRevenue)}</p>
                <p className="text-[10px] md:text-xs text-slate-400">YTD</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3">Net Revenue</p>
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-pink-400">
            &gt;4.5x
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Blended MER</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-violet-400">
            100%
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Organic</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-blue-400">
            0
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Paid Ad Spend</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
          <p className="text-lg md:text-3xl font-bold text-emerald-400">
            Proprietary
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Unit Economics</p>
        </div>
      </div>

      {/* Moat Description */}
      <div className="grid md:grid-cols-3 gap-2 md:gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-lg md:rounded-xl p-3 md:p-4">
          <p className="text-violet-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1">Custom-Built Software</p>
          <p className="text-slate-400 text-[10px] md:text-xs">End-to-end platform automating discovery, outreach, onboarding, tracking, and payouts</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-lg md:rounded-xl p-3 md:p-4">
          <p className="text-pink-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1">Scalable Recruiting</p>
          <p className="text-slate-400 text-[10px] md:text-xs">Automated pipeline finds and qualifies creators—system scales, not headcount</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg md:rounded-xl p-3 md:p-4">
          <p className="text-emerald-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1">Performance Tracking</p>
          <p className="text-slate-400 text-[10px] md:text-xs">Real-time attribution, automated commission calc, instant ROI visibility per creator</p>
        </div>
      </div>
    </div>
  );
}
