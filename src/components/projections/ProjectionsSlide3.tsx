'use client';

import {
  CHANNEL_ECONOMICS,
  Q1_2026_TOTALS,
  Q1_2026_NET_MARGIN,
  ACTUAL_TTM,
  AMAZON_OPPORTUNITY,
  formatCurrency,
} from './projectionModel';

// Calculate channel net margins for display
const dtcNetMargin = CHANNEL_ECONOMICS.dtc.grossMargin -
                     CHANNEL_ECONOMICS.dtc.creatorPayoutRate -
                     CHANNEL_ECONOMICS.dtc.otherOpexRate;

const amazonNetMargin = CHANNEL_ECONOMICS.amazon.grossMargin -
                        CHANNEL_ECONOMICS.amazon.referralFee -
                        CHANNEL_ECONOMICS.amazon.creatorPayoutRate;

export function ProjectionsSlide3() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-emerald-400 font-medium tracking-wide uppercase text-xs md:text-sm mb-2">
          The Amazon Advantage
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
          Revenue Without Marketing Cost
        </h2>
      </div>

      {/* The Key Insight */}
      <div className="bg-gradient-to-r from-orange-500/10 to-emerald-500/10 border border-orange-500/20 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl md:text-4xl font-bold text-orange-400">{formatCurrency(Q1_2026_TOTALS.amazonRevenue)}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Q1 Amazon Revenue</p>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-bold text-emerald-400">$0</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Marketing Spend</p>
          </div>
          <div>
            <p className="text-2xl md:text-4xl font-bold text-white">{(AMAZON_OPPORTUNITY.peakBrandedSearches/1000).toFixed(0)}K</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Nov Branded Searches (BFCM)</p>
          </div>
        </div>
        <p className="text-center text-sm md:text-base text-slate-300 mt-4">
          Customers already searching for the brand on Amazon — we just need to be there
        </p>
      </div>

      {/* Margin Comparison */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {/* DTC Economics */}
        <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
          <p className="text-violet-400 text-xs md:text-sm font-medium mb-3">DTC Channel</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Gross Margin</span>
              <span className="text-white font-bold">{(CHANNEL_ECONOMICS.dtc.grossMargin * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Creator Payouts</span>
              <span className="text-red-400 font-bold">-{(CHANNEL_ECONOMICS.dtc.creatorPayoutRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Other OpEx</span>
              <span className="text-red-400 font-bold">-{(CHANNEL_ECONOMICS.dtc.otherOpexRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-white text-sm font-medium">Net Margin</span>
              <span className="text-violet-400 font-bold text-lg">~{(dtcNetMargin * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Amazon Economics */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl md:rounded-2xl p-4 md:p-6">
          <p className="text-orange-400 text-xs md:text-sm font-medium mb-3">Amazon Channel (FBM)</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Gross Margin</span>
              <span className="text-white font-bold">{(CHANNEL_ECONOMICS.amazon.grossMargin * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Amazon Fees</span>
              <span className="text-red-400 font-bold">-{(CHANNEL_ECONOMICS.amazon.referralFee * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Creator Payouts</span>
              <span className="text-emerald-400 font-bold">$0</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-orange-500/20">
              <span className="text-white text-sm font-medium">Net Margin</span>
              <span className="text-orange-400 font-bold text-lg">~{(amazonNetMargin * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blended Result */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Blended Q1 Net Margin</p>
            <p className="text-[10px] md:text-xs text-slate-400">Higher Amazon mix = higher overall margin</p>
          </div>
          <div className="text-right">
            <p className="text-2xl md:text-3xl font-bold text-emerald-400">{(Q1_2026_NET_MARGIN * 100).toFixed(0)}%</p>
            <p className="text-[10px] md:text-xs text-slate-500">vs {(ACTUAL_TTM.netMargin * 100).toFixed(0)}% TTM</p>
          </div>
        </div>
      </div>

      {/* Key Insight */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-orange-400 font-semibold">Amazon: ~{(amazonNetMargin * 100).toFixed(0)}% net vs DTC: ~{(dtcNetMargin * 100).toFixed(0)}% net</span>
          {' '}— same product, nearly 2x the margin per sale
        </p>
      </div>
    </div>
  );
}
