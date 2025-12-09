'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OverviewPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unlocked = sessionStorage.getItem('dataRoomUnlocked');
    if (unlocked === 'true') {
      setIsAuthorized(true);
    } else {
      router.push('/');
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-slate-900/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dataroom"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Data Room</span>
            </Link>
            <span className="text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              Confidential
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Management Presentation
          </h1>
          <p className="text-slate-400">
            Confidential Information Memorandum
          </p>
        </div>

        {/* Section 1: The Opportunity */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <h2 className="text-2xl font-bold text-white">The Opportunity</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              A bootstrapped DTC wellness brand generating <span className="text-amber-400 font-semibold">$1.8M EBITDA run rate</span> with
              proprietary creator-driven distribution. Built from $75K personal savings in 24 months with zero outside capital.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">$1.8M</p>
                <p className="text-xs text-slate-500">EBITDA Run Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">66%</p>
                <p className="text-xs text-slate-500">Gross Margin</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">70M</p>
                <p className="text-xs text-slate-500">Monthly Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-400">4.5x</p>
                <p className="text-xs text-slate-500">Creator ROAS</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-slate-300 text-sm">
              <span className="text-amber-400 font-semibold">Why now:</span> Founder is starting a new venture-backed company and looking to hand off
              to an operator who can unlock the untapped channels (Amazon, TikTok Shop, paid ads, subscriptions).
            </p>
          </div>
        </section>

        {/* Section 2: Business Model */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <h2 className="text-2xl font-bold text-white">Business Model & Creator Engine</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <p className="text-slate-300 leading-relaxed">
              The business runs on a proprietary creator network: 35 creators posting 2-3x daily on TikTok and Instagram,
              generating 70M+ organic views per month. No paid advertising. 100% organic reach.
            </p>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">The $1 CPM Advantage</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                All-in creator costs (retainers + commissions + management) work out to approximately <span className="text-amber-400 font-semibold">$1 CPM</span> on
                70M monthly views. This is significantly more efficient than paid social, where CPMs typically run $5-15+.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-violet-400 font-semibold text-sm mb-1">Custom Software</p>
                  <p className="text-slate-400 text-xs">Automated discovery, tracking, attribution, and payouts. One person manages 35 creators.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-pink-400 font-semibold text-sm mb-1">Scalable Recruiting</p>
                  <p className="text-slate-400 text-xs">Automated pipeline finds and qualifies creators. Average creator goes viral within 6 weeks of onboarding.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-emerald-400 font-semibold text-sm mb-1">Performance Tracking</p>
                  <p className="text-slate-400 text-xs">Real-time attribution, automated commission calc, instant ROI visibility per creator.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Unit Economics */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <h2 className="text-2xl font-bold text-white">Unit Economics</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Hero SKU Margins</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-400">85%</p>
                  <p className="text-xs text-slate-500">Gross Margin</p>
                </div>
                <div className="text-center bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-400">66%</p>
                  <p className="text-xs text-slate-500">After Shipping & Fulfillment</p>
                </div>
                <div className="text-center bg-white/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-400">28%</p>
                  <p className="text-xs text-slate-500">Net Take Home</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Revenue & Profit Trajectory</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">January 2025</p>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xl font-bold text-white">$86K</p>
                      <p className="text-xs text-slate-500">Revenue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-violet-400">$15K</p>
                      <p className="text-xs text-slate-500">Net Profit</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">November 2025</p>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xl font-bold text-white">$474K</p>
                      <p className="text-xs text-slate-500">Revenue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-violet-400">$147K</p>
                      <p className="text-xs text-slate-500">Net Profit</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Key Cost Lines</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400">Payment Processing (Maverick)</span>
                  <span className="text-slate-300">2-day payouts, no reserve, 0.6% chargeback rate</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400">Refund Rate</span>
                  <span className="text-slate-300">~6.8% (refund-only policy, no physical returns)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400">Software Stack (usage-based)</span>
                  <span className="text-slate-300">OneText, Customers.AI, Klaviyo, Shopify</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Team & Operations */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              4
            </div>
            <h2 className="text-2xl font-bold text-white">Team & Operations</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Owner Time Commitment</h3>
              <p className="text-slate-300 text-sm">
                Current owner spends approximately <span className="text-amber-400 font-semibold">6-7 hours per week</span> on the business:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex justify-between text-sm py-2 px-3 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Creator applications & offers</span>
                  <span className="text-slate-300">1 hr/week</span>
                </div>
                <div className="flex justify-between text-sm py-2 px-3 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Hiring/managing recruiters</span>
                  <span className="text-slate-300">2 hrs/week</span>
                </div>
                <div className="flex justify-between text-sm py-2 px-3 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Inventory & reorders</span>
                  <span className="text-slate-300">1 hr/week</span>
                </div>
                <div className="flex justify-between text-sm py-2 px-3 bg-white/5 rounded-lg">
                  <span className="text-slate-400">Creator manager check-ins</span>
                  <span className="text-slate-300">2 hrs/week</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs">
                Monthly: ~2-3 hours on the 1st for creator payouts and performance review
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Existing Team</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-medium">Creator Managers</p>
                    <p className="text-slate-400 text-xs">One English, one Spanish. Both are creators themselves.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300">2 people</p>
                    <p className="text-slate-500 text-xs">$2K/mo each + performance</p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-medium">Customer Service Reps</p>
                    <p className="text-slate-400 text-xs">Handle support tickets and chargeback disputes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300">2 people</p>
                    <p className="text-slate-500 text-xs">~$4K/mo total</p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-medium">Recruiters</p>
                    <p className="text-slate-400 text-xs">Source and qualify creator applications</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300">2 people</p>
                    <p className="text-slate-500 text-xs">~$2.4K/mo total</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-slate-300 text-sm">
                <span className="text-emerald-400 font-semibold">Key insight:</span> Business runs with minimal owner involvement.
                A part-time ops hire ($2-3K/month) could fully replace owner tasks.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Growth Levers */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              5
            </div>
            <h2 className="text-2xl font-bold text-white">Growth Levers</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <p className="text-slate-300 leading-relaxed">
              Four major channels remain completely untapped. The business has been 100% DTC via Shopify with zero paid advertising.
            </p>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Amazon FBA</h4>
                    <p className="text-slate-400 text-sm mb-2">
                      35,000 branded searches/month already happening on Amazon. Demand exists, just not captured.
                      Eurofins certification complete - ready to list.
                    </p>
                    <p className="text-amber-400 text-xs font-medium">Est. $200-300K/month incremental from existing brand awareness</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">TikTok Shop</h4>
                    <p className="text-slate-400 text-sm mb-2">
                      Natural fit given existing TikTok content presence. Direct purchase integration with existing content flywheel.
                    </p>
                    <p className="text-pink-400 text-xs font-medium">Reduce friction from view to purchase</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Paid Advertising</h4>
                    <p className="text-slate-400 text-sm mb-2">
                      Zero paid ads to date. Massive content library from 35 creators posting 2-3x daily.
                      Proven organic creative translates to predictable paid performance.
                    </p>
                    <p className="text-blue-400 text-xs font-medium">Ready-made creative library for immediate testing</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Subscription Product</h4>
                    <p className="text-slate-400 text-sm mb-2">
                      New daily libido + mood supplement in production. 10,000 units ready mid-January.
                      Unlocks recurring revenue with higher LTV.
                    </p>
                    <p className="text-emerald-400 text-xs font-medium">Predictable cash flow, improved unit economics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Deal Structure */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              6
            </div>
            <h2 className="text-2xl font-bold text-white">Deal Structure</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">What's Included</h3>
              <ul className="space-y-3">
                {[
                  'Brand, IP, and all social accounts',
                  'Proprietary creator software (recruiting, management, tracking)',
                  'Supplier relationships & formulations',
                  'Full Shopify store + customer data',
                  'Existing team relationships',
                  'Transition support from founder',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Inventory Position</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400 text-sm">Finished goods on hand</span>
                  <span className="text-slate-300 text-sm">20K boxes</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400 text-sm">Book value</span>
                  <span className="text-slate-300 text-sm">~$180K</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400 text-sm">Packaging in transit</span>
                  <span className="text-slate-300 text-sm">100K boxes, 50K pouches</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 text-sm">Committed (not yet paid)</span>
                  <span className="text-slate-300 text-sm">~$100K production run</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs pt-2">
                All inventory commitments funded from operating cash flow. No hidden liabilities.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl p-6 text-center">
            <p className="text-slate-300 mb-4">
              Seeking qualified buyers for a Q1 close
            </p>
            <Link
              href="/dataroom/financials"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
            >
              View Financial Detail
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-white/10">
          <p className="text-slate-600 text-xs">
            Confidential - For Qualified Buyers Under NDA Only
          </p>
        </footer>
      </main>
    </div>
  );
}
