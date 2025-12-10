'use client';

import {
  MONTHLY_ACTUALS,
  MONTHLY_PROJECTIONS,
  Q1_2026_TOTALS,
  CHANNEL_ECONOMICS,
  CANNIBALIZATION_RATE,
  Q1_2026_NET_MARGIN,
  HISTORICAL_CONTEXT,
  AMAZON_OPPORTUNITY,
  formatCurrency,
} from './projectionModel';

// Calculate channel margins
const dtcNetMargin = CHANNEL_ECONOMICS.dtc.grossMargin -
                     CHANNEL_ECONOMICS.dtc.creatorPayoutRate -
                     CHANNEL_ECONOMICS.dtc.otherOpexRate;
const amazonNetMargin = CHANNEL_ECONOMICS.amazon.grossMargin -
                        CHANNEL_ECONOMICS.amazon.referralFee;

export function ProjectionsSlide2() {
  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div className="text-center">
        <p className="text-violet-400 font-medium tracking-wide uppercase text-xs md:text-sm mb-2">
          Projection Assumptions
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
          How We Got to {formatCurrency(Q1_2026_TOTALS.revenue)}
        </h2>
      </div>

      {/* Historical Context - The Justification */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-4">
        <p className="text-xs md:text-sm font-medium text-slate-300 mb-3">Historical Growth Pattern</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-slate-500 text-[10px] md:text-xs">Q4 2024</p>
            <p className="text-white font-bold text-sm md:text-lg">{formatCurrency(HISTORICAL_CONTEXT.q4_2024)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] md:text-xs">Q1 2025</p>
            <p className="text-white font-bold text-sm md:text-lg">{formatCurrency(HISTORICAL_CONTEXT.q1_2025)}</p>
            <p className="text-emerald-400 text-[10px]">1.9x QoQ</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] md:text-xs">Q4 2025 (on track)</p>
            <p className="text-emerald-400 font-bold text-sm md:text-lg">{formatCurrency(HISTORICAL_CONTEXT.q4_2025_projected)}</p>
            <p className="text-emerald-400 text-[10px]">7.4x YoY</p>
          </div>
        </div>
        <p className="text-[10px] md:text-xs text-slate-500 mt-3 text-center">
          Q1 2025 Feb was 1.9x Jan (V-Day). Same pattern applied to Q1 2026.
        </p>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* DTC Revenue */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 md:p-4">
          <p className="text-blue-400 text-xs md:text-sm font-medium mb-2">DTC Revenue</p>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(Q1_2026_TOTALS.dtcRevenue)}</p>
          <p className="text-[10px] md:text-xs text-slate-400 mt-1">Q1 2025 pattern scaled to current run rate</p>
        </div>

        {/* Amazon Revenue */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 md:p-4">
          <p className="text-orange-400 text-xs md:text-sm font-medium mb-2">Amazon Revenue</p>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(Q1_2026_TOTALS.amazonRevenue)}</p>
          <p className="text-[10px] md:text-xs text-slate-400 mt-1">{(AMAZON_OPPORTUNITY.avgBrandedSearches/1000).toFixed(0)}K branded searches × 3% conv × $45 AOV</p>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4">
        <p className="text-xs md:text-sm font-medium text-slate-300 mb-3">Monthly Revenue Breakdown</p>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 text-[10px] md:text-xs text-slate-500 pb-2 border-b border-white/10">
            <div>Month</div>
            <div className="text-right">DTC</div>
            <div className="text-right">Amazon</div>
            <div className="text-right">Total</div>
          </div>

          {/* Jan */}
          <div className="grid grid-cols-4 gap-2 text-xs md:text-sm">
            <div className="text-slate-400">Jan 2026</div>
            <div className="text-right text-blue-400">{formatCurrency(MONTHLY_PROJECTIONS.jan26.dtcRevenue)}</div>
            <div className="text-right text-orange-400">{formatCurrency(MONTHLY_PROJECTIONS.jan26.amazonRevenue)}</div>
            <div className="text-right text-white font-medium">{formatCurrency(MONTHLY_PROJECTIONS.jan26.revenue)}</div>
          </div>

          {/* Feb */}
          <div className="grid grid-cols-4 gap-2 text-xs md:text-sm bg-pink-500/10 rounded p-1 -mx-1">
            <div className="text-pink-400">Feb 2026</div>
            <div className="text-right text-blue-400">{formatCurrency(MONTHLY_PROJECTIONS.feb26.dtcRevenue)}</div>
            <div className="text-right text-orange-400">{formatCurrency(MONTHLY_PROJECTIONS.feb26.amazonRevenue)}</div>
            <div className="text-right text-white font-medium">{formatCurrency(MONTHLY_PROJECTIONS.feb26.revenue)}</div>
          </div>

          {/* Mar */}
          <div className="grid grid-cols-4 gap-2 text-xs md:text-sm">
            <div className="text-slate-400">Mar 2026</div>
            <div className="text-right text-blue-400">{formatCurrency(MONTHLY_PROJECTIONS.mar26.dtcRevenue)}</div>
            <div className="text-right text-orange-400">{formatCurrency(MONTHLY_PROJECTIONS.mar26.amazonRevenue)}</div>
            <div className="text-right text-white font-medium">{formatCurrency(MONTHLY_PROJECTIONS.mar26.revenue)}</div>
          </div>

          {/* Total */}
          <div className="grid grid-cols-4 gap-2 text-xs md:text-sm pt-2 border-t border-white/10 font-medium">
            <div className="text-white">Q1 Total</div>
            <div className="text-right text-blue-400">{formatCurrency(Q1_2026_TOTALS.dtcRevenue)}</div>
            <div className="text-right text-orange-400">{formatCurrency(Q1_2026_TOTALS.amazonRevenue)}</div>
            <div className="text-right text-emerald-400">{formatCurrency(Q1_2026_TOTALS.revenue)}</div>
          </div>
        </div>
      </div>

      {/* Margin Assumptions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-4">
        <p className="text-xs md:text-sm font-medium text-slate-300 mb-2">Margin Assumptions</p>
        <div className="grid grid-cols-2 gap-4 text-[10px] md:text-xs">
          <div>
            <p className="text-blue-400 font-medium">DTC Net Margin: {(dtcNetMargin * 100).toFixed(0)}%</p>
            <p className="text-slate-500">{(CHANNEL_ECONOMICS.dtc.grossMargin * 100).toFixed(0)}% GM - {(CHANNEL_ECONOMICS.dtc.creatorPayoutRate * 100).toFixed(0)}% creators - {(CHANNEL_ECONOMICS.dtc.otherOpexRate * 100).toFixed(0)}% opex</p>
          </div>
          <div>
            <p className="text-orange-400 font-medium">Amazon Net Margin: {(amazonNetMargin * 100).toFixed(0)}%</p>
            <p className="text-slate-500">{(CHANNEL_ECONOMICS.amazon.grossMargin * 100).toFixed(0)}% GM - {(CHANNEL_ECONOMICS.amazon.referralFee * 100).toFixed(0)}% fees (FBM)</p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
          <p className="text-slate-400 text-[10px] md:text-xs">
            <span className="text-yellow-400">{(CANNIBALIZATION_RATE * 100).toFixed(0)}% cannibalization</span> — conservative estimate
          </p>
          <p className="text-emerald-400 text-xs md:text-sm font-medium">
            Blended: {(Q1_2026_NET_MARGIN * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Key Insight */}
      <div className="text-center">
        <p className="text-xs md:text-base text-slate-400">
          <span className="text-violet-400 font-semibold">35K branded searches in Nov (BFCM peak)</span>
          {' '}— using 18K avg as conservative baseline
        </p>
      </div>
    </div>
  );
}
