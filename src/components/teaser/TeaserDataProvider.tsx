'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { parseCSV } from '@/lib/csvParser';
import { calculateSectionMonthlyTotal, calculatePLSummary } from '@/lib/calculations';

interface MonthlyData {
  month: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
  affiliateSpend: number;
}

interface TeaserData {
  isLoading: boolean;
  // Hero metrics
  ytdRevenue: number;
  ytdEBITDA: number;
  grossMargin: number;
  revenueGrowthYoY: number;
  // Monthly data for charts
  monthlyData: MonthlyData[];
  // Affiliate metrics
  totalAffiliateSpend: number;
  affiliateROAS: number;
  // Run rate (based on recent months)
  revenueRunRate: number;
  ebitdaRunRate: number;
}

const TeaserDataContext = createContext<TeaserData | null>(null);

export function useTeaserData() {
  const context = useContext(TeaserDataContext);
  if (!context) {
    throw new Error('useTeaserData must be used within TeaserDataProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function TeaserDataProvider({ children }: Props) {
  const [data, setData] = useState<TeaserData>({
    isLoading: true,
    ytdRevenue: 0,
    ytdEBITDA: 0,
    grossMargin: 0,
    revenueGrowthYoY: 0,
    monthlyData: [],
    totalAffiliateSpend: 0,
    affiliateROAS: 0,
    revenueRunRate: 0,
    ebitdaRunRate: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Load transactions via API (exclusions already applied in pipeline)
        const apiToken = process.env.NEXT_PUBLIC_DATA_API_TOKEN || 'dev-token';
        const headers = { 'x-api-token': apiToken };
        const txnResponse = await fetch('/api/data?file=all-txn', { headers });
        const txnCsvText = await txnResponse.text();
        const { transactions, accounts } = parseCSV(txnCsvText);

        // TTM: Dec 2024 through Nov 2025
        const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];

        // Filter to TTM months
        const activeTransactions = transactions.filter(t => ttmMonths.includes(t.month));

        // Calculate monthly data
        const monthlyData: MonthlyData[] = ttmMonths.map(fullMonth => {
          const revenue = calculateSectionMonthlyTotal('revenue', activeTransactions, accounts, fullMonth);
          const cogs = calculateSectionMonthlyTotal('cogs', activeTransactions, accounts, fullMonth);
          const expenses = calculateSectionMonthlyTotal('expenses', activeTransactions, accounts, fullMonth);
          const otherIncome = calculateSectionMonthlyTotal('otherIncome', activeTransactions, accounts, fullMonth);
          const otherExpenses = calculateSectionMonthlyTotal('otherExpenses', activeTransactions, accounts, fullMonth);

          const grossProfit = revenue - cogs;
          const netIncome = grossProfit - expenses + otherIncome - otherExpenses;

          // Get affiliate spend (6120 + 6125)
          const affiliateSpend = activeTransactions
            .filter(t => t.month === fullMonth && (t.accountCode === '6120' || t.accountCode === '6125'))
            .reduce((sum, t) => sum + t.amount, 0);

          // Extract just the month number for display (e.g., "2025-01" -> "01")
          const month = fullMonth.split('-')[1];

          return {
            month,
            revenue,
            grossProfit,
            netIncome,
            affiliateSpend,
          };
        });

        // Calculate totals using standard P&L calculation
        const summary = calculatePLSummary(activeTransactions, accounts);
        const totalAffiliateSpend = monthlyData.reduce((sum, m) => sum + m.affiliateSpend, 0);

        // EBITDA (using net income as proxy)
        const ytdEBITDA = summary.netIncome;

        // Calculate run rate based on last month (November)
        const lastMonth = monthlyData[monthlyData.length - 1];
        const revenueRunRate = lastMonth.revenue * 12;
        const ebitdaRunRate = lastMonth.netIncome * 12;

        // Affiliate ROAS
        const affiliateROAS = totalAffiliateSpend !== 0 ? summary.netRevenue / totalAffiliateSpend : 0;

        // YoY growth (placeholder)
        const revenueGrowthYoY = 0;

        setData({
          isLoading: false,
          ytdRevenue: summary.netRevenue,
          ytdEBITDA,
          grossMargin: summary.grossMargin,
          revenueGrowthYoY,
          monthlyData,
          totalAffiliateSpend,
          affiliateROAS,
          revenueRunRate,
          ebitdaRunRate,
        });
      } catch (error) {
        console.error('Error loading teaser data:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }

    loadData();
  }, []);

  return (
    <TeaserDataContext.Provider value={data}>
      {children}
    </TeaserDataContext.Provider>
  );
}
