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

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function TeaserSlide1() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  const heroMetrics = [
    {
      label: 'EBITDA Run Rate',
      value: formatCurrency(data.ebitdaRunRate),
      sublabel: 'Based on November',
    },
    {
      label: 'Monthly Views',
      value: '70M',
      sublabel: 'Organic short-form content',
    },
    {
      label: 'Creator ROAS',
      value: `${data.affiliateROAS.toFixed(1)}x`,
      sublabel: 'Return on creator spend',
    },
    {
      label: 'Gross Margin',
      value: `${data.grossMargin.toFixed(0)}%`,
      sublabel: 'After shipping & fulfillment',
    },
  ];

  return (
    <div className="text-center space-y-6 md:space-y-12">
      {/* Tagline */}
      <div className="space-y-3 md:space-y-4">
        <p className="text-violet-400 font-medium tracking-wide uppercase text-xs md:text-sm">
          Deal Overview
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          A DTC Wellness Brand
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
            With Proprietary Distribution
          </span>
        </h1>
        <p className="text-sm md:text-xl text-slate-400 max-w-3xl mx-auto mt-4 md:mt-6 px-2">
          70M+ monthly organic views powered by custom creator software. Zero paid ads. Amazon, TikTok Shop still untapped.
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {heroMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-6 hover:bg-white/10 transition-all"
          >
            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2">
              {metric.label}
            </p>
            <p className="text-xl md:text-4xl font-bold text-white mb-0.5 md:mb-1">
              {metric.value}
            </p>
            <p className="text-[10px] md:text-xs text-slate-500">
              {metric.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* Origin Story Teaser */}
      <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl mx-auto">
        <p className="text-slate-300 text-sm md:text-lg">
          <span className="text-violet-400 font-semibold">$75K → $1.8M EBITDA</span>
          {' '}in 24 months, bootstrapped. Built on compounding creator economics.
        </p>
      </div>
    </div>
  );
}
