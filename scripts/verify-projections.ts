import {
  ACTUAL_TTM,
  CHANNEL_ECONOMICS,
  CANNIBALIZATION_RATE,
  MONTHLY_PROJECTIONS,
  Q1_2026_TOTALS,
  Q1_2026_NET_MARGIN,
  FORWARD_SDE,
  ANNUALIZED_RUN_RATE,
  formatCurrency,
} from '../src/components/projections/projectionModel';

console.log('=== PROJECTION MODEL VERIFICATION ===\n');

console.log('ACTUAL P&L DATA:');
console.log(`  TTM Revenue: ${formatCurrency(ACTUAL_TTM.revenue)}`);
console.log(`  TTM Gross Margin: ${(ACTUAL_TTM.grossMargin * 100).toFixed(1)}%`);
console.log(`  TTM Net Income: ${formatCurrency(ACTUAL_TTM.netIncome)}`);
console.log(`  TTM Net Margin: ${(ACTUAL_TTM.netMargin * 100).toFixed(1)}%`);

console.log('\nCHANNEL ECONOMICS:');
const dtcNet = CHANNEL_ECONOMICS.dtc.grossMargin - CHANNEL_ECONOMICS.dtc.creatorPayoutRate - CHANNEL_ECONOMICS.dtc.otherOpexRate;
const amazonNet = CHANNEL_ECONOMICS.amazon.grossMargin - CHANNEL_ECONOMICS.amazon.referralFee;
console.log(`  DTC: ${(CHANNEL_ECONOMICS.dtc.grossMargin*100).toFixed(0)}% GM - ${(CHANNEL_ECONOMICS.dtc.creatorPayoutRate*100).toFixed(0)}% creators - ${(CHANNEL_ECONOMICS.dtc.otherOpexRate*100).toFixed(0)}% opex = ${(dtcNet*100).toFixed(0)}% net`);
console.log(`  Amazon: ${(CHANNEL_ECONOMICS.amazon.grossMargin*100).toFixed(0)}% GM - ${(CHANNEL_ECONOMICS.amazon.referralFee*100).toFixed(0)}% fees = ${(amazonNet*100).toFixed(0)}% net`);
console.log(`  Cannibalization Rate: ${(CANNIBALIZATION_RATE*100).toFixed(0)}% (${(CANNIBALIZATION_RATE*100).toFixed(0)}% of Amazon would have been DTC)`);

console.log('\nQ1 2026 MONTHLY BREAKDOWN:');
const months = ['jan26', 'feb26', 'mar26'] as const;
months.forEach(m => {
  const proj = MONTHLY_PROJECTIONS[m];
  const margin = (proj.netIncome / proj.revenue * 100).toFixed(0);
  console.log(`  ${m}: ${formatCurrency(proj.revenue)} rev → ${formatCurrency(proj.netIncome)} net (${margin}% margin)`);
  console.log(`    DTC: ${formatCurrency(proj.dtcRevenue)}, Amazon: ${formatCurrency(proj.amazonRevenue)}`);
});

console.log('\nQ1 2026 TOTALS:');
console.log(`  Revenue: ${formatCurrency(Q1_2026_TOTALS.revenue)}`);
console.log(`  DTC Revenue: ${formatCurrency(Q1_2026_TOTALS.dtcRevenue)}`);
console.log(`  Amazon Revenue: ${formatCurrency(Q1_2026_TOTALS.amazonRevenue)}`);
console.log(`  Net Income: ${formatCurrency(Q1_2026_TOTALS.netIncome)}`);
console.log(`  Net Margin: ${(Q1_2026_NET_MARGIN * 100).toFixed(1)}%`);

console.log('\nFORWARD SDE:');
console.log(`  Forward SDE (Apr 25 - Mar 26): ${formatCurrency(FORWARD_SDE)}`);
console.log(`  Annualized Run Rate: ${formatCurrency(ANNUALIZED_RUN_RATE)}`);
