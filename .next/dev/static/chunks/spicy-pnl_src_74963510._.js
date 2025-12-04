(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPLRows",
    ()=>buildPLRows,
    "calculateMonthlyAmounts",
    ()=>calculateMonthlyAmounts,
    "calculatePLSummary",
    ()=>calculatePLSummary,
    "calculateSectionMonthlyTotal",
    ()=>calculateSectionMonthlyTotal,
    "getAccountTransactions",
    ()=>getAccountTransactions,
    "getTaggedTransactionsGrouped",
    ()=>getTaggedTransactionsGrouped,
    "groupTransactionsByMonth",
    ()=>groupTransactionsByMonth
]);
function getAccountTransactions(accountCode, transactions, accounts, tags, includeTagged = false) {
    const account = accounts.get(accountCode);
    if (!account) return [];
    // Get direct transactions
    let result = transactions.filter((t)=>{
        const matchesAccount = t.accountCode === accountCode || t.parentAccountCode === accountCode && !accounts.has(t.accountCode);
        const isTagged = tags[t.id] !== undefined;
        return matchesAccount && (includeTagged || !isTagged);
    });
    // Add child account transactions
    for (const childCode of account.children){
        result = result.concat(getAccountTransactions(childCode, transactions, accounts, tags, includeTagged));
    }
    return result;
}
function calculateMonthlyAmounts(accountCode, transactions, accounts, months, tags) {
    const accountTransactions = getAccountTransactions(accountCode, transactions, accounts, tags);
    const monthlyAmounts = {};
    months.forEach((m)=>{
        monthlyAmounts[m] = 0;
    });
    let ytdTotal = 0;
    for (const txn of accountTransactions){
        if (txn.month && monthlyAmounts[txn.month] !== undefined) {
            monthlyAmounts[txn.month] += txn.amount;
            ytdTotal += txn.amount;
        }
    }
    return {
        monthlyAmounts,
        ytdTotal,
        transactionCount: accountTransactions.length
    };
}
function buildPLRows(section, transactions, accounts, months, tags) {
    const rows = [];
    // Get top-level accounts for this section
    const topLevelAccounts = Array.from(accounts.values()).filter((a)=>a.section === section && a.parentCode === null).sort((a, b)=>a.code.localeCompare(b.code));
    for (const account of topLevelAccounts){
        const { monthlyAmounts, ytdTotal, transactionCount } = calculateMonthlyAmounts(account.code, transactions, accounts, months, tags);
        // Only add if there's activity
        if (ytdTotal !== 0 || transactionCount > 0) {
            rows.push({
                accountCode: account.code,
                account,
                monthlyAmounts,
                ytdTotal,
                transactionCount
            });
        }
    }
    return rows;
}
function calculatePLSummary(transactions, accounts, tags) {
    // Filter out tagged transactions
    const activeTransactions = transactions.filter((t)=>!tags[t.id]);
    const taggedTransactions = transactions.filter((t)=>tags[t.id]);
    // Calculate by section
    const bySection = (section)=>activeTransactions.filter((t)=>{
            const account = accounts.get(t.accountCode);
            if (!account) return false;
            // Check if this account or its parent matches the section
            if (account.section === section) return true;
            if (t.parentAccountCode) {
                const parent = accounts.get(t.parentAccountCode);
                if (parent?.section === section) return true;
            }
            return false;
        }).reduce((sum, t)=>sum + t.amount, 0);
    // Revenue breakdown
    const revenueTransactions = activeTransactions.filter((t)=>{
        const code = parseInt(t.accountCode, 10);
        return code >= 4000 && code < 4100;
    });
    // Gross revenue (4000 Sales + 4030 Shipping)
    const grossRevenue = revenueTransactions.filter((t)=>t.accountCode === '4000' || t.accountCode === '4030').reduce((sum, t)=>sum + t.amount, 0);
    // Contra revenue (discounts, refunds, chargebacks - these are negative)
    const contraRevenue = revenueTransactions.filter((t)=>t.accountCode === '4010' || t.accountCode === '4020' || t.accountCode === '4040').reduce((sum, t)=>sum + t.amount, 0);
    const netRevenue = grossRevenue + contraRevenue;
    // Cost sections
    const totalCOGS = bySection('cogs');
    const totalCostOfSales = bySection('costOfSales');
    const totalOpEx = bySection('operatingExpenses');
    const otherIncome = bySection('otherIncome');
    // Calculated metrics
    const grossProfit = netRevenue - totalCOGS - totalCostOfSales;
    const grossMargin = netRevenue !== 0 ? grossProfit / netRevenue * 100 : 0;
    const netIncome = grossProfit - totalOpEx + otherIncome;
    const netMargin = netRevenue !== 0 ? netIncome / netRevenue * 100 : 0;
    // Tagged items - use net amount (not absolute) to match exclusions display
    const taggedAmount = taggedTransactions.reduce((sum, t)=>sum + t.amount, 0);
    return {
        grossRevenue,
        netRevenue,
        totalCOGS,
        totalCostOfSales,
        grossProfit,
        grossMargin,
        totalOpEx,
        otherIncome,
        netIncome,
        netMargin,
        taggedItemsCount: taggedTransactions.length,
        taggedAmount
    };
}
function groupTransactionsByMonth(transactions) {
    const grouped = {};
    for (const txn of transactions){
        if (!grouped[txn.month]) {
            grouped[txn.month] = [];
        }
        grouped[txn.month].push(txn);
    }
    // Sort transactions within each month by date
    for (const month of Object.keys(grouped)){
        grouped[month].sort((a, b)=>{
            const dateA = new Date(a.transactionDate);
            const dateB = new Date(b.transactionDate);
            return dateA.getTime() - dateB.getTime();
        });
    }
    return grouped;
}
function getTaggedTransactionsGrouped(transactions, tags) {
    const result = {
        personal: {},
        nonRecurring: {}
    };
    for (const txn of transactions){
        const tag = tags[txn.id];
        if (!tag) continue;
        if (!result[tag.category][tag.subAccount]) {
            result[tag.category][tag.subAccount] = [];
        }
        result[tag.category][tag.subAccount].push(txn);
    }
    return result;
}
function calculateSectionMonthlyTotal(section, transactions, accounts, month, tags) {
    return transactions.filter((t)=>{
        if (tags[t.id]) return false;
        if (t.month !== month) return false;
        const account = accounts.get(t.accountCode);
        if (!account) return false;
        if (account.section === section) return true;
        if (t.parentAccountCode) {
            const parent = accounts.get(t.parentAccountCode);
            if (parent?.section === section) return true;
        }
        return false;
    }).reduce((sum, t)=>sum + t.amount, 0);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserDataProvider",
    ()=>TeaserDataProvider,
    "useTeaserData",
    ()=>useTeaserData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
const TeaserDataContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function useTeaserData() {
    _s();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(TeaserDataContext);
    if (!context) {
        throw new Error('useTeaserData must be used within TeaserDataProvider');
    }
    return context;
}
_s(useTeaserData, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
function TeaserDataProvider({ children }) {
    _s1();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        isLoading: true,
        ytdRevenue: 0,
        ytdEBITDA: 0,
        grossMargin: 0,
        revenueGrowthYoY: 0,
        monthlyData: [],
        totalAffiliateSpend: 0,
        affiliateROAS: 0,
        revenueRunRate: 0,
        ebitdaRunRate: 0
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeaserDataProvider.useEffect": ()=>{
            async function loadData() {
                try {
                    // Load transactions
                    const txnResponse = await fetch('/all-txn.csv');
                    const txnCsvText = await txnResponse.text();
                    const { transactions, accounts } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseCSV"])(txnCsvText);
                    // Load exclusions
                    const exclResponse = await fetch('/exclusions.csv');
                    const exclCsvText = await exclResponse.text();
                    const tags = parseExclusions(exclCsvText, transactions);
                    // Filter to 2025 and exclude December
                    // Transaction.month format is "YYYY-MM" (e.g., "2025-01")
                    const months2025 = [
                        '2025-01',
                        '2025-02',
                        '2025-03',
                        '2025-04',
                        '2025-05',
                        '2025-06',
                        '2025-07',
                        '2025-08',
                        '2025-09',
                        '2025-10',
                        '2025-11'
                    ];
                    const activeTransactions = transactions.filter({
                        "TeaserDataProvider.useEffect.loadData.activeTransactions": (t)=>months2025.includes(t.month) && !tags[t.id]
                    }["TeaserDataProvider.useEffect.loadData.activeTransactions"]);
                    console.log('Teaser debug:', {
                        totalTransactions: transactions.length,
                        activeTransactions: activeTransactions.length,
                        excludedCount: Object.keys(tags).length,
                        months: [
                            ...new Set(transactions.map({
                                "TeaserDataProvider.useEffect.loadData": (t)=>t.month
                            }["TeaserDataProvider.useEffect.loadData"]))
                        ].sort(),
                        accountsSize: accounts.size
                    });
                    // Debug: check what sections exist
                    const sectionCounts = {};
                    activeTransactions.forEach({
                        "TeaserDataProvider.useEffect.loadData": (t)=>{
                            const account = accounts.get(t.accountCode);
                            if (account) {
                                sectionCounts[account.section] = (sectionCounts[account.section] || 0) + 1;
                            }
                        }
                    }["TeaserDataProvider.useEffect.loadData"]);
                    console.log('Section counts:', sectionCounts);
                    // Calculate monthly data
                    const monthlyData = months2025.map({
                        "TeaserDataProvider.useEffect.loadData.monthlyData": (fullMonth)=>{
                            const revenue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('revenue', activeTransactions, accounts, fullMonth, tags);
                            const cogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('cogs', activeTransactions, accounts, fullMonth, tags);
                            const cos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('costOfSales', activeTransactions, accounts, fullMonth, tags);
                            const opex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('operatingExpenses', activeTransactions, accounts, fullMonth, tags);
                            const other = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('otherIncome', activeTransactions, accounts, fullMonth, tags);
                            const grossProfit = revenue - cogs - cos;
                            const netIncome = grossProfit - opex + other;
                            // Get affiliate spend (6120 + 6125)
                            const affiliateSpend = activeTransactions.filter({
                                "TeaserDataProvider.useEffect.loadData.monthlyData.affiliateSpend": (t)=>t.month === fullMonth && (t.accountCode === '6120' || t.accountCode === '6125')
                            }["TeaserDataProvider.useEffect.loadData.monthlyData.affiliateSpend"]).reduce({
                                "TeaserDataProvider.useEffect.loadData.monthlyData.affiliateSpend": (sum, t)=>sum + t.amount
                            }["TeaserDataProvider.useEffect.loadData.monthlyData.affiliateSpend"], 0);
                            // Extract just the month number for display (e.g., "2025-01" -> "01")
                            const month = fullMonth.split('-')[1];
                            console.log(`Month ${fullMonth}: revenue=${revenue}, cogs=${cogs}, cos=${cos}, opex=${opex}, other=${other}`);
                            return {
                                month,
                                revenue,
                                grossProfit,
                                netIncome,
                                affiliateSpend
                            };
                        }
                    }["TeaserDataProvider.useEffect.loadData.monthlyData"]);
                    console.log('Monthly data:', monthlyData);
                    // Calculate YTD totals
                    const ytdRevenue = monthlyData.reduce({
                        "TeaserDataProvider.useEffect.loadData.ytdRevenue": (sum, m)=>sum + m.revenue
                    }["TeaserDataProvider.useEffect.loadData.ytdRevenue"], 0);
                    const ytdGrossProfit = monthlyData.reduce({
                        "TeaserDataProvider.useEffect.loadData.ytdGrossProfit": (sum, m)=>sum + m.grossProfit
                    }["TeaserDataProvider.useEffect.loadData.ytdGrossProfit"], 0);
                    const ytdNetIncome = monthlyData.reduce({
                        "TeaserDataProvider.useEffect.loadData.ytdNetIncome": (sum, m)=>sum + m.netIncome
                    }["TeaserDataProvider.useEffect.loadData.ytdNetIncome"], 0);
                    const totalAffiliateSpend = monthlyData.reduce({
                        "TeaserDataProvider.useEffect.loadData.totalAffiliateSpend": (sum, m)=>sum + m.affiliateSpend
                    }["TeaserDataProvider.useEffect.loadData.totalAffiliateSpend"], 0);
                    // Gross margin
                    const grossMargin = ytdRevenue !== 0 ? ytdGrossProfit / ytdRevenue * 100 : 0;
                    // EBITDA (using net income as proxy - would need D&A adjustments for true EBITDA)
                    const ytdEBITDA = ytdNetIncome;
                    // Calculate run rate based on last month (November)
                    const lastMonth = monthlyData[monthlyData.length - 1];
                    const revenueRunRate = lastMonth.revenue * 12;
                    const ebitdaRunRate = lastMonth.netIncome * 12;
                    console.log('Run rate calc:', {
                        lastMonth: {
                            month: lastMonth.month,
                            revenue: lastMonth.revenue,
                            netIncome: lastMonth.netIncome
                        },
                        revenueRunRate,
                        ebitdaRunRate
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
                        ebitdaRunRate
                    });
                } catch (error) {
                    console.error('Error loading teaser data:', error);
                    setData({
                        "TeaserDataProvider.useEffect.loadData": (prev)=>({
                                ...prev,
                                isLoading: false
                            })
                    }["TeaserDataProvider.useEffect.loadData"]);
                }
            }
            loadData();
        }
    }["TeaserDataProvider.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TeaserDataContext.Provider, {
        value: data,
        children: children
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx",
        lineNumber: 183,
        columnNumber: 5
    }, this);
}
_s1(TeaserDataProvider, "jrhOkSz52BkNvwLYx12ZKqtOToY=");
_c = TeaserDataProvider;
// Parse CSV line handling quoted fields
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for(let j = 0; j < line.length; j++){
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
function parseExclusions(csvText, transactions) {
    const tags = {};
    const lines = csvText.trim().split('\n');
    // Skip header row
    for(let i = 1; i < lines.length; i++){
        const line = lines[i];
        if (!line.trim()) continue;
        const fields = parseCSVLine(line);
        if (fields.length < 8) continue;
        const date = fields[0];
        const accountCode = fields[4];
        const amount = parseFloat(fields[5]) || 0;
        const category = fields[6];
        // Find matching transaction by date, amount, and account code
        const match = transactions.find((t)=>{
            const dateMatch = t.transactionDate === date;
            const amountMatch = Math.abs(t.amount - amount) < 0.01;
            const accountMatch = t.accountCode === accountCode;
            return dateMatch && amountMatch && accountMatch && !tags[t.id];
        });
        if (match) {
            tags[match.id] = {
                category: category.includes('Personal') || category === 'Discretionary' ? 'personal' : 'nonRecurring',
                subAccount: category,
                taggedAt: Date.now()
            };
        }
    }
    return tags;
}
var _c;
__turbopack_context__.k.register(_c, "TeaserDataProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide1",
    ()=>TeaserSlide1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
function formatNumber(value) {
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(0)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
}
function TeaserSlide1() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                lineNumber: 31,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this);
    }
    const heroMetrics = [
        {
            label: 'EBITDA Run Rate',
            value: formatCurrency(data.ebitdaRunRate),
            sublabel: 'Based on November'
        },
        {
            label: 'Monthly Views',
            value: '70M',
            sublabel: 'Organic short-form content'
        },
        {
            label: 'Creator ROAS',
            value: `${data.affiliateROAS.toFixed(1)}x`,
            sublabel: 'Return on creator spend'
        },
        {
            label: 'Gross Margin',
            value: `${data.grossMargin.toFixed(0)}%`,
            sublabel: 'After shipping & fulfillment'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-center space-y-6 md:space-y-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3 md:space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-violet-400 font-medium tracking-wide uppercase text-xs md:text-sm",
                        children: "Deal Overview"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight",
                        children: [
                            "A Viral Content Engine",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                                lineNumber: 68,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400",
                                children: "Monetized Through DTC Wellness"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                                lineNumber: 69,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                        lineNumber: 66,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-xl text-slate-400 max-w-3xl mx-auto mt-4 md:mt-6 px-2",
                        children: "Creator-led e-commerce brand generating 70M+ monthly views with Amazon, TikTok Shop, and paid ads still untapped."
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                        lineNumber: 73,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-3 md:gap-6",
                children: heroMetrics.map((metric, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-6 hover:bg-white/10 transition-all",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2",
                                children: metric.label
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                                lineNumber: 85,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl md:text-4xl font-bold text-white mb-0.5 md:mb-1",
                                children: metric.value
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                                lineNumber: 88,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500",
                                children: metric.sublabel
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                                lineNumber: 91,
                                columnNumber: 13
                            }, this)
                        ]
                    }, index, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                        lineNumber: 81,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl mx-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-slate-300 text-sm md:text-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-violet-400 font-semibold",
                            children: "$75K → $1.8M EBITDA"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                            lineNumber: 101,
                            columnNumber: 11
                        }, this),
                        ' ',
                        "in 24 months, bootstrapped. Built on compounding creator economics."
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                    lineNumber: 100,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide1, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide1;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide1");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide2",
    ()=>TeaserSlide2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function getMonthLabel(month) {
    const monthNum = month.split('-')[1]; // "2025-01" -> "01"
    const names = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Aug',
        '09': 'Sep',
        '10': 'Oct',
        '11': 'Nov',
        '12': 'Dec'
    };
    return names[monthNum] || month;
}
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
function TeaserSlide2() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                lineNumber: 31,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this);
    }
    const maxRevenue = Math.max(...data.monthlyData.map((m)=>m.revenue));
    const ytdRevenue = data.monthlyData.reduce((sum, m)=>sum + m.revenue, 0);
    // Calculate growth from first to last month
    const firstMonth = data.monthlyData[0]?.revenue || 0;
    const lastMonth = data.monthlyData[data.monthlyData.length - 1]?.revenue || 0;
    const growthMultiple = firstMonth > 0 ? lastMonth / firstMonth : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 md:space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2",
                        children: "Revenue Growth"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-base text-slate-400",
                        children: "Monthly net revenue (Jan - Nov 2025)"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-end gap-1 md:gap-4 h-40 md:h-80",
                    children: data.monthlyData.map((month, index)=>{
                        const height = maxRevenue > 0 ? month.revenue / maxRevenue * 100 : 0;
                        const isHighlight = index === data.monthlyData.length - 1;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 flex flex-col items-center h-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `text-[8px] md:text-sm font-mono mb-1 md:mb-2 ${isHighlight ? 'text-violet-400' : 'text-slate-400'} ${isHighlight ? '' : 'hidden md:block'}`,
                                    children: formatCurrency(month.revenue)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                    lineNumber: 67,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 w-full flex items-end",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-full rounded-t transition-all duration-500 ${isHighlight ? 'bg-gradient-to-t from-violet-600 to-violet-400' : 'bg-gradient-to-t from-slate-600 to-slate-500'}`,
                                        style: {
                                            height: `${Math.max(height, 2)}%`
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                        lineNumber: 73,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                    lineNumber: 72,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `text-[8px] md:text-xs font-medium mt-1 md:mt-2 ${isHighlight ? 'text-violet-400' : 'text-slate-500'}`,
                                    children: getMonthLabel(month.month)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                    lineNumber: 84,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, month.month, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                            lineNumber: 65,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                    lineNumber: 59,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-3 gap-2 md:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base md:text-3xl font-bold text-white",
                                children: formatCurrency(ytdRevenue)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 96,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "YTD Revenue"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 99,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                        lineNumber: 95,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base md:text-3xl font-bold text-violet-400",
                                children: formatCurrency(lastMonth)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 102,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "Nov Revenue"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base md:text-3xl font-bold text-emerald-400",
                                children: formatCurrency(data.revenueRunRate)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "Run Rate"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                        lineNumber: 107,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs md:text-base text-slate-400",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-emerald-400 font-semibold",
                            children: [
                                growthMultiple.toFixed(1),
                                "x growth"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                            lineNumber: 118,
                            columnNumber: 11
                        }, this),
                        ' ',
                        "Jan → Nov — no paid ads, no Amazon"
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                    lineNumber: 117,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide2, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide2;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide2");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide3",
    ()=>TeaserSlide3
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function getMonthLabel(month) {
    const monthNum = month.split('-')[1]; // "2025-01" -> "01"
    const names = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Aug',
        '09': 'Sep',
        '10': 'Oct',
        '11': 'Nov',
        '12': 'Dec'
    };
    return names[monthNum] || month;
}
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
function TeaserSlide3() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                lineNumber: 31,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this);
    }
    const ytdGrossProfit = data.monthlyData.reduce((sum, m)=>sum + m.grossProfit, 0);
    const ytdNetIncome = data.monthlyData.reduce((sum, m)=>sum + m.netIncome, 0);
    const ytdRevenue = data.monthlyData.reduce((sum, m)=>sum + m.revenue, 0);
    // Calculate margins
    const gpMargin = ytdRevenue > 0 ? ytdGrossProfit / ytdRevenue * 100 : 0;
    const netMargin = ytdRevenue > 0 ? ytdNetIncome / ytdRevenue * 100 : 0;
    // Get max for chart scaling
    const maxGP = Math.max(...data.monthlyData.map((m)=>m.grossProfit));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 md:space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2",
                        children: "Profit Engine"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-base text-slate-400",
                        children: "Strong unit economics with expanding margins"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-end gap-1 md:gap-4 h-36 md:h-72",
                        children: data.monthlyData.map((month, index)=>{
                            const gpHeight = maxGP > 0 ? month.grossProfit / maxGP * 100 : 0;
                            const netHeight = maxGP > 0 ? Math.max(month.netIncome, 0) / maxGP * 100 : 0;
                            const isHighlight = index === data.monthlyData.length - 1;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 flex flex-col items-center h-full",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-full flex-1 flex items-end justify-center gap-px md:gap-0.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `w-1/2 rounded-t transition-all duration-500 ${isHighlight ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-emerald-700 to-emerald-600'}`,
                                                style: {
                                                    height: `${Math.max(gpHeight, 2)}%`
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                                lineNumber: 72,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `w-1/2 rounded-t transition-all duration-500 ${isHighlight ? 'bg-gradient-to-t from-violet-600 to-violet-400' : 'bg-gradient-to-t from-violet-700 to-violet-600'}`,
                                                style: {
                                                    height: `${Math.max(netHeight, 2)}%`
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                                lineNumber: 81,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 70,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `text-[8px] md:text-xs font-medium mt-1 md:mt-2 ${isHighlight ? 'text-white' : 'text-slate-500'}`,
                                        children: getMonthLabel(month.month)
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 92,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, month.month, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 68,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-center gap-4 md:gap-6 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 md:gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-2 h-2 md:w-3 md:h-3 rounded bg-emerald-500"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 103,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] md:text-sm text-slate-400",
                                        children: "Gross Profit"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 104,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 102,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 md:gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-2 h-2 md:w-3 md:h-3 rounded bg-violet-500"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 107,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] md:text-sm text-slate-400",
                                        children: "EBITDA"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                        lineNumber: 108,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-emerald-400",
                                children: formatCurrency(ytdGrossProfit)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 116,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "YTD Gross Profit"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 119,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 115,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-emerald-400",
                                children: [
                                    gpMargin.toFixed(0),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 122,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "Gross Margin"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 125,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 121,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-violet-400",
                                children: formatCurrency(ytdNetIncome)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 128,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "YTD EBITDA"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 131,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 127,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-violet-400",
                                children: [
                                    netMargin.toFixed(0),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 134,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "EBITDA Margin"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs md:text-base text-slate-400",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-emerald-400 font-semibold",
                            children: [
                                formatCurrency(data.ebitdaRunRate),
                                " run rate"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                            lineNumber: 144,
                            columnNumber: 11
                        }, this),
                        ' ',
                        "— high-margin, capital-light model"
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                    lineNumber: 143,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
                lineNumber: 142,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide3, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide3;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide3");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide4",
    ()=>TeaserSlide4
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
function TeaserSlide4() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                lineNumber: 21,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this);
    }
    const ytdRevenue = data.monthlyData.reduce((sum, m)=>sum + m.revenue, 0);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 md:space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2",
                        children: "The Content Machine"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-base text-slate-400",
                        children: "Creator-powered organic reach that converts"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-20 h-20 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 flex items-center justify-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xl md:text-4xl font-bold text-pink-400",
                                                children: "70M"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 47,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] md:text-xs text-slate-400",
                                                children: "views/mo"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 48,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                        lineNumber: 46,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 45,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3",
                                    children: "Organic Reach"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 51,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 44,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden md:block",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-12 h-12 text-slate-600",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M9 5l7 7-7 7"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 57,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 56,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "md:hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-5 h-5 text-slate-600 rotate-90",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M9 5l7 7-7 7"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 62,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 60,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-18 h-18 md:w-36 md:h-36 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center",
                                    style: {
                                        width: '4.5rem',
                                        height: '4.5rem'
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xl md:text-4xl font-bold text-violet-400",
                                                children: "35"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 70,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] md:text-xs text-slate-400",
                                                children: "creators"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 71,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                        lineNumber: 69,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 68,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3",
                                    children: "Managed Network"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 74,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 67,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden md:block",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-12 h-12 text-slate-600",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M9 5l7 7-7 7"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 80,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 79,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "md:hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-5 h-5 text-slate-600 rotate-90",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M9 5l7 7-7 7"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 85,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 84,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 83,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-16 h-16 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-base md:text-3xl font-bold text-emerald-400",
                                                children: formatCurrency(ytdRevenue)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 93,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] md:text-xs text-slate-400",
                                                children: "YTD"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                                lineNumber: 94,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                        lineNumber: 92,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs md:text-sm text-slate-400 mt-1.5 md:mt-3",
                                    children: "Net Revenue"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                    lineNumber: 97,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                            lineNumber: 90,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-pink-400",
                                children: [
                                    data.affiliateROAS.toFixed(1),
                                    "x"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "Creator ROAS"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-violet-400",
                                children: "$1"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "CPM"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 114,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-blue-400",
                                children: "0"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 117,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "Paid Ad Spend"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 116,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg md:text-3xl font-bold text-emerald-400",
                                children: formatCurrency(data.totalAffiliateSpend)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 123,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                children: "YTD Creator Spend"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 126,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                lineNumber: 103,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid md:grid-cols-3 gap-2 md:gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-lg md:rounded-xl p-3 md:p-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-violet-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1",
                                children: "Proprietary Software"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 133,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-slate-400 text-[10px] md:text-xs",
                                children: "Custom creator management platform for tracking, communication, and payments"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 134,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 132,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-lg md:rounded-xl p-3 md:p-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-pink-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1",
                                children: "Retainer + Commission"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-slate-400 text-[10px] md:text-xs",
                                children: "Hybrid model aligns incentives and ensures consistent content output"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 138,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 136,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg md:rounded-xl p-3 md:p-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-emerald-400 font-semibold text-xs md:text-sm mb-0.5 md:mb-1",
                                children: "Compounding Flywheel"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 141,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-slate-400 text-[10px] md:text-xs",
                                children: "Views drive revenue, revenue funds creators, creators drive views"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                                lineNumber: 142,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                        lineNumber: 140,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
                lineNumber: 131,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide4, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide4;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide4");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide5",
    ()=>TeaserSlide5
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
const GROWTH_LEVERS = [
    {
        title: 'Amazon FBA',
        status: 'Not Started',
        statusColor: 'text-amber-400',
        description: 'Category is proven on Amazon. Same product format already sells well.',
        potential: 'Similar brands doing $2-5M ARR on Amazon alone',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-8 h-8",
            fill: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 24,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
            lineNumber: 23,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        title: 'TikTok Shop',
        status: 'Not Started',
        statusColor: 'text-amber-400',
        description: 'Natural fit given existing TikTok content presence.',
        potential: 'Direct purchase integration with existing content flywheel',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-8 h-8",
            fill: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 36,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
            lineNumber: 35,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        title: 'Paid Advertising',
        status: 'Not Started',
        statusColor: 'text-amber-400',
        description: 'Zero paid ads to date. Huge creative library for testing.',
        potential: 'Proven organic creative → predictable paid performance',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-8 h-8",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                    lineNumber: 49,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
            lineNumber: 47,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        title: 'Subscription Model',
        status: 'In Development',
        statusColor: 'text-emerald-400',
        description: 'Subscription product currently in production.',
        potential: 'Recurring revenue, higher LTV, predictable cash flow',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-8 h-8",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 61,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
            lineNumber: 60,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }
];
function TeaserSlide5() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 73,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
            lineNumber: 72,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 md:space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2",
                        children: "Untapped Growth Levers"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-base text-slate-400",
                        children: "Major channels remain completely unexplored"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4",
                children: GROWTH_LEVERS.map((lever, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-6 hover:bg-white/10 transition-all",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col md:flex-row md:items-start gap-2 md:gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-violet-400 hidden md:block",
                                    children: lever.icon
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 98,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1 md:mb-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-sm md:text-lg font-semibold text-white",
                                                    children: lever.title
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                                    lineNumber: 103,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `text-[10px] md:text-xs font-medium ${lever.statusColor} bg-white/5 px-1.5 md:px-2 py-0.5 rounded-full w-fit`,
                                                    children: lever.status
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                                    lineNumber: 104,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                            lineNumber: 102,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-400 text-[10px] md:text-sm mb-1 md:mb-2 line-clamp-2 md:line-clamp-none",
                                            children: lever.description
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                            lineNumber: 108,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-500 text-[10px] md:text-xs italic hidden md:block",
                                            children: lever.potential
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                            lineNumber: 109,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 101,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                            lineNumber: 97,
                            columnNumber: 13
                        }, this)
                    }, index, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                        lineNumber: 93,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-gradient-to-r from-violet-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-4 md:p-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2",
                                    children: "Current Run Rate"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xl md:text-4xl font-bold text-white",
                                    children: formatCurrency(data.revenueRunRate)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-sm text-slate-400 mt-0.5 md:mt-1",
                                    children: "100% organic, DTC only"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 122,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                            lineNumber: 119,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1 md:mb-2",
                                    children: "Potential Upside"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 125,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xl md:text-4xl font-bold text-emerald-400",
                                    children: "2-3x"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 126,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-sm text-slate-400 mt-0.5 md:mt-1",
                                    children: "With full channel deployment"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                                    lineNumber: 127,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                            lineNumber: 124,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                    lineNumber: 118,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs md:text-base text-slate-400",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-violet-400 font-semibold",
                            children: "Low-hanging fruit for a buyer"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                            lineNumber: 135,
                            columnNumber: 11
                        }, this),
                        ' ',
                        "— proven playbook, just needs execution"
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                    lineNumber: 134,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
                lineNumber: 133,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx",
        lineNumber: 79,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide5, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide5;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide5");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeaserSlide6",
    ()=>TeaserSlide6
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/script.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
}
function TeaserSlide6() {
    _s();
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"])();
    if (data.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-96",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                lineNumber: 23,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 md:space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2",
                        children: "The Opportunity"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm md:text-base text-slate-400",
                        children: "Strategic acquisition of a proven content-commerce engine"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-lg md:text-4xl font-bold text-violet-400",
                                    children: formatCurrency(data.ebitdaRunRate)
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 44,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                    children: "EBITDA Run Rate"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 47,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                            lineNumber: 43,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-lg md:text-4xl font-bold text-emerald-400",
                                    children: [
                                        data.grossMargin.toFixed(0),
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 50,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                    children: "Gross Margin"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 53,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-lg md:text-4xl font-bold text-pink-400",
                                    children: "70M"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 56,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                    children: "Monthly Views"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 59,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-lg md:text-4xl font-bold text-blue-400",
                                    children: [
                                        data.affiliateROAS.toFixed(1),
                                        "x"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 62,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1",
                                    children: "Creator ROAS"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 65,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid md:grid-cols-2 gap-3 md:gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl md:rounded-2xl p-3 md:p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm md:text-lg font-semibold text-white mb-2 md:mb-4",
                                children: "What's Included"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "space-y-1.5 md:space-y-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M5 13l4 4L19 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 77,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 76,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Brand, IP, and all social accounts"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 79,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 75,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M5 13l4 4L19 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 83,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 82,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Creator network + management software"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 85,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 81,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M5 13l4 4L19 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 89,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 88,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Supplier relationships & formulations"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 91,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 87,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M5 13l4 4L19 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 95,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 94,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Full Shopify store + customer data"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 97,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 93,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-emerald-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M5 13l4 4L19 7"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 101,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 100,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Transition support from founder"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 103,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 99,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl p-3 md:p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm md:text-lg font-semibold text-white mb-2 md:mb-4",
                                children: "Ideal Buyer Profile"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                lineNumber: 109,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "space-y-1.5 md:space-y-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M13 10V3L4 14h7v7l9-11h-7z"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 113,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 112,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "E-commerce aggregator or strategic acquirer"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 115,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 111,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M13 10V3L4 14h7v7l9-11h-7z"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 119,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 118,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Existing Amazon or paid ads infrastructure"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 121,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 117,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M13 10V3L4 14h7v7l9-11h-7z"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 125,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 124,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Experience scaling DTC wellness brands"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 127,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 123,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-start gap-2 md:gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-4 h-4 md:w-5 md:h-5 text-violet-400 mt-0.5 flex-shrink-0",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M13 10V3L4 14h7v7l9-11h-7z"
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                    lineNumber: 131,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 130,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-xs md:text-sm",
                                                children: "Ready to deploy growth capital"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                                lineNumber: 133,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                        lineNumber: 129,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                lineNumber: 110,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                lineNumber: 71,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs md:text-base text-slate-400 mb-3 md:mb-4",
                        children: "Seeking qualified buyers for a January close"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        "data-tf-popup": "UU2u54HH",
                        "data-tf-opacity": "100",
                        "data-tf-size": "100",
                        "data-tf-iframe-props": "title=Acquisition Inquiry",
                        "data-tf-medium": "snippet",
                        className: "inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-5 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-lg transition-all hover:scale-105 shadow-lg shadow-violet-500/25",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-4 h-4 md:w-5 md:h-5",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                    lineNumber: 153,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                                lineNumber: 152,
                                columnNumber: 11
                            }, this),
                            "Request a Call"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 144,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        src: "//embed.typeform.com/next/embed.js",
                        strategy: "lazyOnload"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 157,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] md:text-xs text-slate-600 mt-3 md:mt-4",
                        children: "Confidential details shared after qualification"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                        lineNumber: 161,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_s(TeaserSlide6, "c3WDCUoAbQYiRBCxt0eN2svfWu4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTeaserData"]
    ];
});
_c = TeaserSlide6;
var _c;
__turbopack_context__.k.register(_c, "TeaserSlide6");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/app/teaser/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TeaserPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide1$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide1.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide2$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide2.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide3$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide3.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide4$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide4.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide5$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide5.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide6$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserSlide6.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/teaser/TeaserDataProvider.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
const SLIDES = [
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide1$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide1"],
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide2$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide2"],
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide3$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide3"],
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide4$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide4"],
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide5$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide5"],
    __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserSlide6$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserSlide6"]
];
function TeaserPage() {
    _s();
    const [currentSlide, setCurrentSlide] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const goToSlide = (index)=>{
        if (index >= 0 && index < SLIDES.length) {
            setCurrentSlide(index);
        }
    };
    const nextSlide = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TeaserPage.useCallback[nextSlide]": ()=>{
            if (currentSlide < SLIDES.length - 1) {
                setCurrentSlide(currentSlide + 1);
            }
        }
    }["TeaserPage.useCallback[nextSlide]"], [
        currentSlide
    ]);
    const prevSlide = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "TeaserPage.useCallback[prevSlide]": ()=>{
            if (currentSlide > 0) {
                setCurrentSlide(currentSlide - 1);
            }
        }
    }["TeaserPage.useCallback[prevSlide]"], [
        currentSlide
    ]);
    // Keyboard navigation
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeaserPage.useEffect": ()=>{
            const handleKeyDown = {
                "TeaserPage.useEffect.handleKeyDown": (e)=>{
                    if (e.key === 'ArrowRight' || e.key === ' ') {
                        e.preventDefault();
                        nextSlide();
                    } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        prevSlide();
                    }
                }
            }["TeaserPage.useEffect.handleKeyDown"];
            window.addEventListener('keydown', handleKeyDown);
            return ({
                "TeaserPage.useEffect": ()=>window.removeEventListener('keydown', handleKeyDown)
            })["TeaserPage.useEffect"];
        }
    }["TeaserPage.useEffect"], [
        nextSlide,
        prevSlide
    ]);
    const CurrentSlideComponent = SLIDES[currentSlide];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$teaser$2f$TeaserDataProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TeaserDataProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute top-4 left-4 md:top-6 md:left-6 z-10",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "flex items-center gap-1 md:gap-2 text-slate-500 hover:text-white transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-5 h-5",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M15 19l-7-7 7-7"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                    lineNumber: 71,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                lineNumber: 70,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium hidden sm:inline",
                                children: "Back"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                lineNumber: 73,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                        lineNumber: 66,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                    lineNumber: 65,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center p-4 pt-14 md:p-8 md:pt-16 overflow-y-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full max-w-6xl",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CurrentSlideComponent, {}, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                            lineNumber: 80,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                        lineNumber: 79,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                    lineNumber: 78,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 md:p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-w-6xl mx-auto flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: prevSlide,
                                    disabled: currentSlide === 0,
                                    className: `flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg font-medium transition-all
                ${currentSlide === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10'}
              `,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5",
                                            fill: "none",
                                            stroke: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M15 19l-7-7 7-7"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                                lineNumber: 99,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                            lineNumber: 98,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "hidden sm:inline",
                                            children: "Previous"
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                            lineNumber: 101,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                    lineNumber: 88,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-1.5 md:gap-2",
                                    children: SLIDES.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>goToSlide(index),
                                            className: `w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all
                    ${index === currentSlide ? 'bg-violet-500 w-6 md:w-8' : 'bg-slate-600 hover:bg-slate-500'}
                  `
                                        }, index, false, {
                                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                            lineNumber: 107,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                    lineNumber: 105,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: nextSlide,
                                    disabled: currentSlide === SLIDES.length - 1,
                                    className: `flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg font-medium transition-all
                ${currentSlide === SLIDES.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10'}
              `,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "hidden sm:inline",
                                            children: "Next"
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                            lineNumber: 131,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5",
                                            fill: "none",
                                            stroke: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M9 5l7 7-7 7"
                                            }, void 0, false, {
                                                fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                                lineNumber: 133,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                            lineNumber: 132,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                            lineNumber: 86,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "hidden md:block text-center text-slate-600 text-xs mt-4",
                            children: "Use arrow keys or spacebar to navigate"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                            lineNumber: 139,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
                    lineNumber: 85,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
            lineNumber: 63,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/app/teaser/page.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
_s(TeaserPage, "NGqutZWMgwoUhraXtvrT8KeaO8U=");
_c = TeaserPage;
var _c;
__turbopack_context__.k.register(_c, "TeaserPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=spicy-pnl_src_74963510._.js.map