// Shared Projection Model
// All numbers flow from this single source of truth

// ============================================
// ACTUAL P&L DATA (from render-pnl.ts output)
// ============================================
export const ACTUAL_TTM = {
  revenue: 2323164,
  grossProfit: 1524244,
  grossMargin: 0.656, // 65.6%

  // Operating expenses breakdown
  creatorPayouts: 520991,    // 22.4% of revenue
  processingFees: 109189,    // 4.7%
  paidAds: 63986,            // Google + FB + Other
  marketingAgencies: 37325,
  software: 80629,           // Apps + Marketing Software + Other
  contractors: 22154,
  accounting: 21938,
  other: 10207,

  totalOpex: 866420,
  netIncome: 657824,
  netMargin: 0.283, // 28.3%
};

// Monthly actuals (from P&L)
export const MONTHLY_ACTUALS = {
  dec24: { revenue: 85757, netIncome: 13479 },
  jan25: { revenue: 63723, netIncome: 14538 },
  feb25: { revenue: 119580, netIncome: 44866 },
  mar25: { revenue: 76857, netIncome: 19624 },
  apr25: { revenue: 148762, netIncome: 55742 },
  may25: { revenue: 251077, netIncome: 86216 },
  jun25: { revenue: 275525, netIncome: 106541 },
  jul25: { revenue: 201260, netIncome: 26597 },
  aug25: { revenue: 178535, netIncome: 34073 },
  sep25: { revenue: 180280, netIncome: 45955 },
  oct25: { revenue: 267531, netIncome: 62862 },
  nov25: { revenue: 474275, netIncome: 147333 },
};

// ============================================
// PROJECTION ASSUMPTIONS
// ============================================

// Cannibalization assumption: some Amazon sales would have been DTC
// Conservative estimate: 30% of Amazon sales cannibalize DTC
export const CANNIBALIZATION_RATE = 0.30;

// Channel economics
export const CHANNEL_ECONOMICS = {
  dtc: {
    grossMargin: 0.656,        // Same as historical
    creatorPayoutRate: 0.224,  // 22.4% of DTC revenue (from P&L: 521K / 2.32M)
    otherOpexRate: 0.148,      // Processing, software, etc (~15% of rev)
    // Net margin: 66% - 22% - 15% = ~28%
  },
  amazon: {
    grossMargin: 0.656,        // Same product costs
    referralFee: 0.15,         // 15% Amazon referral fee (FBM)
    creatorPayoutRate: 0,      // No creator payouts - organic search
    otherOpexRate: 0,          // Minimal incremental opex
    // Net margin: 66% - 15% = ~51%
  },
};

// ============================================
// HISTORICAL GROWTH CONTEXT
// ============================================
// Q4 2024 revenue: $135K
// Q1 2025 revenue: $260K (1.9x QoQ growth)
// Q4 2025 revenue: ~$1M (on track: Oct $268K + Nov $474K + Dec ~$320K)
// YoY growth Q4: 7.4x ($135K → $1M)

export const HISTORICAL_CONTEXT = {
  q4_2024: 135000,
  q1_2025: 260000,
  q4_2025_projected: 1000000, // Oct + Nov + Dec on track
  qoq_growth_2025: 1.93, // Q1 25 / Q4 24
  yoy_q4_growth: 7.4,    // Q4 25 / Q4 24
};

// Amazon opportunity: 35K branded searches/month (Nov peak due to BFCM)
// Conservative estimate: 15K-20K average branded searches
export const AMAZON_OPPORTUNITY = {
  peakBrandedSearches: 35000,   // Nov 2025 (BFCM peak)
  avgBrandedSearches: 18000,    // Conservative monthly average
  estimatedConversion: 0.03,    // 3% search-to-purchase
  avgOrderValue: 45,            // Estimated AOV on Amazon
};

// ============================================
// Q1 2026 PROJECTIONS
// ============================================

// DTC baseline: Apply same QoQ growth pattern as Q1 2025 vs Q4 2024
// Q4 2025 DTC ~$1M → Q1 2026 DTC estimate: $1M * 0.9 = ~$900K (seasonal dip typical)
// Actually use monthly patterns from Q1 2025 scaled up

// Q1 2025 monthly pattern: Jan $64K, Feb $120K (V-Day 1.9x), Mar $77K = $260K total
// Q1 2025 Feb was 46% of Q1, Jan was 24%, Mar was 30%
// Apply to projected Q1 DTC base of ~$850K (conservative)

export const Q1_2026_REVENUE = {
  // DTC: Conservative - assume flat to slight growth vs Q4 monthly avg
  // Q4 2025 avg = $333K/mo, Q1 typically lower, use $280K avg
  jan: { dtc: 250000, amazon: 100000, total: 350000 },
  // Feb V-Day: Q1 2025 Feb was 1.9x Jan. Apply same pattern
  // Also historical: Feb 25 was $120K when avg was ~$85K (1.4x)
  feb: { dtc: 350000, amazon: 120000, total: 470000 },
  // Mar: typical post-V-Day drop
  mar: { dtc: 230000, amazon: 100000, total: 330000 },
};

// Amazon revenue justification:
// 18K avg searches × 3% conversion × $45 AOV = $24K/mo baseline
// Ramp: Jan launch = 4x (promo), Feb = 5x (V-Day), Mar = 4x (normalized)
// Conservative vs branded search potential

// Calculate net income for each channel
function calculateDtcNetIncome(revenue: number): number {
  const econ = CHANNEL_ECONOMICS.dtc;
  const grossProfit = revenue * econ.grossMargin;
  const creatorPayouts = revenue * econ.creatorPayoutRate;
  const otherOpex = revenue * econ.otherOpexRate;
  return grossProfit - creatorPayouts - otherOpex;
}

function calculateAmazonNetIncome(revenue: number): number {
  const econ = CHANNEL_ECONOMICS.amazon;
  const grossProfit = revenue * econ.grossMargin;
  const amazonFees = revenue * econ.referralFee;
  return grossProfit - amazonFees;
}

// Calculate blended net income accounting for cannibalization
// Cannibalized portion: Amazon margin instead of DTC margin (net improvement)
// Incremental portion: Full Amazon margin (new revenue)
function calculateBlendedNetIncome(dtcRevenue: number, amazonRevenue: number): number {
  // DTC net income
  const dtcNet = calculateDtcNetIncome(dtcRevenue);

  // Amazon breakdown:
  // - Cannibalized: would have been DTC, so net gain is (Amazon margin - DTC margin)
  // - Incremental: full Amazon margin
  const cannibalizedRevenue = amazonRevenue * CANNIBALIZATION_RATE;
  const incrementalRevenue = amazonRevenue * (1 - CANNIBALIZATION_RATE);

  // For cannibalized: we lose the DTC sale we would have had, but gain Amazon sale
  // Net effect = Amazon net - DTC net (on that revenue)
  const cannibalizedNet = calculateAmazonNetIncome(cannibalizedRevenue) - calculateDtcNetIncome(cannibalizedRevenue);

  // For incremental: full Amazon margin
  const incrementalNet = calculateAmazonNetIncome(incrementalRevenue);

  return dtcNet + cannibalizedNet + incrementalNet;
}

// Monthly projections with full breakdown
export const MONTHLY_PROJECTIONS = {
  dec25: {
    revenue: 320000,
    dtcRevenue: 320000,
    amazonRevenue: 0,
    netIncome: calculateDtcNetIncome(320000),
  },
  jan26: {
    revenue: Q1_2026_REVENUE.jan.total,
    dtcRevenue: Q1_2026_REVENUE.jan.dtc,
    amazonRevenue: Q1_2026_REVENUE.jan.amazon,
    netIncome: calculateBlendedNetIncome(Q1_2026_REVENUE.jan.dtc, Q1_2026_REVENUE.jan.amazon),
  },
  feb26: {
    revenue: Q1_2026_REVENUE.feb.total,
    dtcRevenue: Q1_2026_REVENUE.feb.dtc,
    amazonRevenue: Q1_2026_REVENUE.feb.amazon,
    netIncome: calculateBlendedNetIncome(Q1_2026_REVENUE.feb.dtc, Q1_2026_REVENUE.feb.amazon),
  },
  mar26: {
    revenue: Q1_2026_REVENUE.mar.total,
    dtcRevenue: Q1_2026_REVENUE.mar.dtc,
    amazonRevenue: Q1_2026_REVENUE.mar.amazon,
    netIncome: calculateBlendedNetIncome(Q1_2026_REVENUE.mar.dtc, Q1_2026_REVENUE.mar.amazon),
  },
};

// Q1 2026 totals
export const Q1_2026_TOTALS = {
  revenue: MONTHLY_PROJECTIONS.jan26.revenue + MONTHLY_PROJECTIONS.feb26.revenue + MONTHLY_PROJECTIONS.mar26.revenue,
  dtcRevenue: MONTHLY_PROJECTIONS.jan26.dtcRevenue + MONTHLY_PROJECTIONS.feb26.dtcRevenue + MONTHLY_PROJECTIONS.mar26.dtcRevenue,
  amazonRevenue: MONTHLY_PROJECTIONS.jan26.amazonRevenue + MONTHLY_PROJECTIONS.feb26.amazonRevenue + MONTHLY_PROJECTIONS.mar26.amazonRevenue,
  netIncome: MONTHLY_PROJECTIONS.jan26.netIncome + MONTHLY_PROJECTIONS.feb26.netIncome + MONTHLY_PROJECTIONS.mar26.netIncome,
};

export const Q1_2026_NET_MARGIN = Q1_2026_TOTALS.netIncome / Q1_2026_TOTALS.revenue;

// ============================================
// FORWARD SDE CALCULATION
// ============================================

// Rolling off (Dec 24 - Mar 25 actuals)
const ROLLING_OFF =
  MONTHLY_ACTUALS.dec24.netIncome +
  MONTHLY_ACTUALS.jan25.netIncome +
  MONTHLY_ACTUALS.feb25.netIncome +
  MONTHLY_ACTUALS.mar25.netIncome;

// Forward SDE = TTM + Dec 25 + Q1 26 - Rolling off
export const FORWARD_SDE =
  ACTUAL_TTM.netIncome +
  MONTHLY_PROJECTIONS.dec25.netIncome +
  Q1_2026_TOTALS.netIncome -
  ROLLING_OFF;

// Annualized run rate from Q1
export const ANNUALIZED_RUN_RATE = Q1_2026_TOTALS.netIncome * 4;

// ============================================
// HELPER FOR DISPLAY
// ============================================
export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}
