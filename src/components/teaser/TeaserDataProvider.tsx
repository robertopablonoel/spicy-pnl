'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { parseCSV } from '@/lib/csvParser';
import { Transaction, Account, TransactionTag } from '@/types';
import { calculatePLSummary, calculateSectionMonthlyTotal } from '@/lib/calculations';

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
        // Load transactions
        const txnResponse = await fetch('/all-txn.csv');
        const txnCsvText = await txnResponse.text();
        const { transactions, accounts } = parseCSV(txnCsvText);

        // Load exclusions
        const exclResponse = await fetch('/exclusions.csv');
        const exclCsvText = await exclResponse.text();
        const tags = parseExclusions(exclCsvText, transactions);

        // Transaction.month format is "YYYY-MM" (e.g., "2025-01")
        // TTM: Dec 2024 through Nov 2025
        const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];

        // For gross margin calculation, use TTM months
        // DON'T filter by tags here - calculatePLSummary does that internally
        const allTransactionsTTM = transactions.filter(t => ttmMonths.includes(t.month));

        // For monthly charts, only use 2025 data (also don't filter by tags - calculation functions handle it)
        const activeTransactions = transactions.filter(t =>
          ttmMonths.includes(t.month) &&
          !tags[t.id]
        );

        console.log('Teaser debug:', {
          totalTransactions: transactions.length,
          activeTransactions: activeTransactions.length,
          excludedCount: Object.keys(tags).length,
          months: [...new Set(transactions.map(t => t.month))].sort(),
          accountsSize: accounts.size,
        });

        // Debug: check what sections exist
        const sectionCounts: Record<string, number> = {};
        activeTransactions.forEach(t => {
          const account = accounts.get(t.accountCode);
          if (account) {
            sectionCounts[account.section] = (sectionCounts[account.section] || 0) + 1;
          }
        });
        console.log('Section counts:', sectionCounts);

        // Calculate monthly data
        const monthlyData: MonthlyData[] = ttmMonths.map(fullMonth => {
          const revenue = calculateSectionMonthlyTotal('revenue', activeTransactions, accounts, fullMonth, tags);
          const cogs = calculateSectionMonthlyTotal('cogs', activeTransactions, accounts, fullMonth, tags);
          const cos = calculateSectionMonthlyTotal('costOfSales', activeTransactions, accounts, fullMonth, tags);
          const opex = calculateSectionMonthlyTotal('operatingExpenses', activeTransactions, accounts, fullMonth, tags);
          const other = calculateSectionMonthlyTotal('otherIncome', activeTransactions, accounts, fullMonth, tags);

          const grossProfit = revenue - cogs - cos;
          const netIncome = grossProfit - opex + other;

          // Get affiliate spend (6120 + 6125)
          const affiliateSpend = activeTransactions
            .filter(t => t.month === fullMonth && (t.accountCode === '6120' || t.accountCode === '6125'))
            .reduce((sum, t) => sum + t.amount, 0);

          // Extract just the month number for display (e.g., "2025-01" -> "01")
          const month = fullMonth.split('-')[1];

          console.log(`Month ${fullMonth}: revenue=${revenue}, cogs=${cogs}, cos=${cos}, opex=${opex}, other=${other}`);

          return {
            month,
            revenue,
            grossProfit,
            netIncome,
            affiliateSpend,
          };
        });

        console.log('Monthly data:', monthlyData);

        // Calculate YTD totals
        const ytdRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
        const ytdGrossProfit = monthlyData.reduce((sum, m) => sum + m.grossProfit, 0);
        const ytdNetIncome = monthlyData.reduce((sum, m) => sum + m.netIncome, 0);
        const totalAffiliateSpend = monthlyData.reduce((sum, m) => sum + m.affiliateSpend, 0);

        // Gross margin - calculate same as KHBrokersView for consistency with displayed P&L
        // KH Income accounts: Sales (4000, 4030), Discounts (4010), Refunds (4020), Chargebacks (4040)
        // KH COGS accounts: Product Costs (5000, 5030, 5040, 5050), Shipping & Fulfillment (5010, 6010, 6020, 6035)
        const khIncomeAccounts = ['4000', '4030', '4010', '4020', '4040'];
        const khCogsAccounts = ['5000', '5030', '5040', '5050', '5010', '6010', '6020', '6035'];

        const khActiveTxns = allTransactionsTTM.filter(t => !tags[t.id]);
        const khTotalIncome = khActiveTxns
          .filter(t => khIncomeAccounts.includes(t.accountCode))
          .reduce((sum, t) => sum + t.amount, 0);
        const khTotalCogs = khActiveTxns
          .filter(t => khCogsAccounts.includes(t.accountCode))
          .reduce((sum, t) => sum + t.amount, 0);
        const khGrossProfit = khTotalIncome - khTotalCogs;
        const grossMargin = khTotalIncome !== 0 ? (khGrossProfit / khTotalIncome) * 100 : 0;


        // EBITDA (using net income as proxy - would need D&A adjustments for true EBITDA)
        const ytdEBITDA = ytdNetIncome;

        // Calculate run rate based on last month (November)
        const lastMonth = monthlyData[monthlyData.length - 1];
        const revenueRunRate = lastMonth.revenue * 12;
        const ebitdaRunRate = lastMonth.netIncome * 12;

        console.log('Run rate calc:', {
          lastMonth: { month: lastMonth.month, revenue: lastMonth.revenue, netIncome: lastMonth.netIncome },
          revenueRunRate,
          ebitdaRunRate,
        });

        // Affiliate ROAS
        const affiliateROAS = totalAffiliateSpend !== 0 ? ytdRevenue / totalAffiliateSpend : 0;

        // YoY growth (placeholder - would need 2024 data)
        const revenueGrowthYoY = 0; // TODO: calculate from 2024 data if available

        setData({
          isLoading: false,
          ytdRevenue,
          ytdEBITDA,
          grossMargin,
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

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

// Helper to parse exclusions CSV and match to transactions
function parseExclusions(csvText: string, transactions: Transaction[]): Record<string, TransactionTag> {
  const tags: Record<string, TransactionTag> = {};
  const lines = csvText.trim().split('\n');

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 8) continue;

    const date = fields[0];
    const accountCode = fields[4];
    const amount = parseFloat(fields[5]) || 0;
    const category = fields[6];

    // Find matching transaction by date, amount, and account code
    const match = transactions.find(t => {
      const dateMatch = t.transactionDate === date;
      const amountMatch = Math.abs(t.amount - amount) < 0.01;
      const accountMatch = t.accountCode === accountCode;
      return dateMatch && amountMatch && accountMatch && !tags[t.id];
    });

    if (match) {
      tags[match.id] = {
        category: category.includes('Personal') || category === 'Discretionary' ? 'personal' : 'nonRecurring',
        subAccount: category,
        taggedAt: Date.now(),
      };
    }
  }

  return tags;
}
