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

const GROWTH_LEVERS = [
  {
    title: 'Amazon FBA',
    status: 'Not Started',
    statusColor: 'text-amber-400',
    description: '35K branded searches/month already on Amazon. Demand exists, just not captured.',
    potential: '$1.5-2M ARR opportunity from existing brand awareness',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
  },
  {
    title: 'TikTok Shop',
    status: 'Not Started',
    statusColor: 'text-amber-400',
    description: 'Natural fit given existing TikTok content presence.',
    potential: 'Direct purchase integration with existing content flywheel',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  },
  {
    title: 'Paid Advertising',
    status: 'Not Started',
    statusColor: 'text-amber-400',
    description: 'Zero paid ads to date. Huge creative library for testing.',
    potential: 'Proven organic creative → predictable paid performance',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    title: 'Subscription Model',
    status: 'In Development',
    statusColor: 'text-emerald-400',
    description: 'Subscription product currently in production.',
    potential: 'Recurring revenue, higher LTV, predictable cash flow',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

export function TeaserSlide5() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
          Untapped Growth Levers
        </h2>
        <p className="text-sm md:text-base text-slate-400">
          Major channels remain completely unexplored
        </p>
      </div>

      {/* Growth Levers Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
        {GROWTH_LEVERS.map((lever, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
              <div className="text-violet-400 hidden md:block">
                {lever.icon}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1 md:mb-2">
                  <h3 className="text-sm md:text-lg font-semibold text-white">{lever.title}</h3>
                  <span className={`text-[10px] md:text-xs font-medium ${lever.statusColor} bg-white/5 px-1.5 md:px-2 py-0.5 rounded-full w-fit`}>
                    {lever.status}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] md:text-sm mb-1 md:mb-2 line-clamp-2 md:line-clamp-none">{lever.description}</p>
                <p className="text-slate-500 text-[10px] md:text-xs italic hidden md:block">{lever.potential}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current vs Potential */}
      <div className="bg-gradient-to-r from-violet-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8">
          <div className="text-center">
            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2">Current Run Rate</p>
            <p className="text-xl md:text-4xl font-bold text-white">{formatCurrency(data.revenueRunRate)}</p>
            <p className="text-[10px] md:text-sm text-slate-400 mt-0.5 md:mt-1">100% organic, DTC only</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2">Potential Upside</p>
            <p className="text-xl md:text-4xl font-bold text-emerald-400">2-3x</p>
            <p className="text-[10px] md:text-sm text-slate-400 mt-0.5 md:mt-1">With full channel deployment</p>
          </div>
        </div>
      </div>

      {/* Why Now Callout */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-violet-400 font-semibold">Low-hanging fruit for a buyer</span>
          {' '}— proven playbook, just needs execution
        </p>
      </div>
    </div>
  );
}
