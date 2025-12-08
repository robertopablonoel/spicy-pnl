'use client';

import { PopupButton } from '@typeform/embed-react';
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
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
          The Opportunity
        </h2>
        <p className="text-sm md:text-base text-slate-400">
          Profitable DTC brand with proprietary distribution and untapped channels
        </p>
      </div>

      {/* Key Numbers Summary */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <div className="text-center">
            <p className="text-lg md:text-4xl font-bold text-violet-400">
              {formatCurrency(data.ebitdaRunRate)}
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">EBITDA Run Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg md:text-4xl font-bold text-emerald-400">
              {data.grossMargin.toFixed(0)}%
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Gross Margin</p>
          </div>
          <div className="text-center">
            <p className="text-lg md:text-4xl font-bold text-pink-400">
              70M
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Monthly Views</p>
          </div>
          <div className="text-center">
            <p className="text-lg md:text-4xl font-bold text-blue-400">
              35
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Active Creators</p>
          </div>
        </div>
      </div>

      {/* Deal Structure */}
      <div className="grid md:grid-cols-2 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold text-white mb-2 md:mb-4">What's Included</h3>
          <ul className="space-y-1.5 md:space-y-3">
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Brand, IP, and all social accounts</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Proprietary creator software (recruiting, management, tracking)</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Supplier relationships & formulations</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Full Shopify store + customer data</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Transition support from founder</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl p-3 md:p-6">
          <h3 className="text-sm md:text-lg font-semibold text-white mb-2 md:mb-4">Ideal Buyer Profile</h3>
          <ul className="space-y-1.5 md:space-y-3">
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">E-commerce aggregator or strategic acquirer</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Existing Amazon or paid ads infrastructure</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Experience scaling DTC wellness brands</span>
            </li>
            <li className="flex items-start gap-2 md:gap-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-300 text-xs md:text-sm">Ready to deploy growth capital</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Timeline & CTA */}
      <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 text-center">
        <p className="text-xs md:text-base text-slate-400 mb-3 md:mb-4">
          Seeking qualified buyers for a January close
        </p>
        <PopupButton
          id="UU2u54HH"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-5 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-lg transition-all hover:scale-105 shadow-lg shadow-violet-500/25"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Request a Call
        </PopupButton>
        <p className="text-[10px] md:text-xs text-slate-600 mt-3 md:mt-4">
          Confidential details shared after qualification
        </p>
      </div>
    </div>
  );
}
