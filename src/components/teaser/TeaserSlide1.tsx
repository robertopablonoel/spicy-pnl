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
      sublabel: 'Based on trailing 3 months',
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
    <div className="text-center space-y-12">
      {/* Tagline */}
      <div className="space-y-4">
        <p className="text-violet-400 font-medium tracking-wide uppercase text-sm">
          Investment Opportunity
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          A Viral Content Engine
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
            Monetized Through DTC Wellness
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto mt-6">
          Creator-led e-commerce brand generating 70M+ monthly views with Amazon, TikTok Shop, and paid ads still untapped.
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {heroMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              {metric.label}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">
              {metric.value}
            </p>
            <p className="text-xs text-slate-500">
              {metric.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* Origin Story Teaser */}
      <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-2xl p-6 max-w-2xl mx-auto">
        <p className="text-slate-300 text-lg">
          <span className="text-violet-400 font-semibold">$75K → $1.8M EBITDA</span>
          {' '}in 24 months, bootstrapped. Built on compounding creator economics.
        </p>
      </div>
    </div>
  );
}
