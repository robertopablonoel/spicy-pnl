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

export function TeaserSlide6() {
  const data = useTeaserData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          The Opportunity
        </h2>
        <p className="text-slate-400">
          Strategic acquisition of a proven content-commerce engine
        </p>
      </div>

      {/* Key Numbers Summary */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-violet-400">
              {formatCurrency(data.ebitdaRunRate)}
            </p>
            <p className="text-xs text-slate-500 mt-1">EBITDA Run Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-emerald-400">
              {data.grossMargin.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Gross Margin</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-pink-400">
              70M
            </p>
            <p className="text-xs text-slate-500 mt-1">Monthly Views</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-blue-400">
              {data.affiliateROAS.toFixed(1)}x
            </p>
            <p className="text-xs text-slate-500 mt-1">Creator ROAS</p>
          </div>
        </div>
      </div>

      {/* Deal Structure */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">What's Included</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">Brand, IP, and all social accounts</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">Creator network + management software</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">Supplier relationships & formulations</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">Full Shopify store + customer data</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">Transition support from founder</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Ideal Buyer Profile</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-sm">E-commerce aggregator or strategic acquirer</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-sm">Existing Amazon or paid ads infrastructure</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-sm">Experience scaling DTC wellness brands</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-sm">Ready to deploy growth capital</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Timeline & CTA */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-slate-400 mb-4">
          Seeking qualified buyers for a January close
        </p>
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Request Full CIM
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Confidential Information Memorandum available under NDA
        </p>
      </div>
    </div>
  );
}
