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
    // Tagged items
    const taggedAmount = taggedTransactions.reduce((sum, t)=>sum + Math.abs(t.amount), 0);
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
"[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SummaryCards",
    ()=>SummaryCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function SummaryCards() {
    _s();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const summary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SummaryCards.useMemo[summary]": ()=>{
            if (state.transactions.length === 0) return null;
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculatePLSummary"])(state.transactions, state.accounts, state.tags);
        }
    }["SummaryCards.useMemo[summary]"], [
        state.transactions,
        state.accounts,
        state.tags
    ]);
    if (!summary) return null;
    const cards = [
        {
            label: 'Net Revenue',
            value: summary.netRevenue,
            color: 'bg-emerald-50 border-emerald-200',
            textColor: 'text-emerald-700',
            valueColor: 'text-emerald-900'
        },
        {
            label: 'Gross Profit',
            value: summary.grossProfit,
            subLabel: `${summary.grossMargin.toFixed(1)}% margin`,
            color: 'bg-blue-50 border-blue-200',
            textColor: 'text-blue-700',
            valueColor: 'text-blue-900'
        },
        {
            label: 'Net Income',
            value: summary.netIncome,
            subLabel: `${summary.netMargin.toFixed(1)}% margin`,
            color: summary.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
            textColor: summary.netIncome >= 0 ? 'text-green-700' : 'text-red-700',
            valueColor: summary.netIncome >= 0 ? 'text-green-900' : 'text-red-900'
        },
        {
            label: 'Tagged Items',
            value: summary.taggedAmount,
            subLabel: `${summary.taggedItemsCount} transactions`,
            color: 'bg-amber-50 border-amber-200',
            textColor: 'text-amber-700',
            valueColor: 'text-amber-900'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6",
        children: cards.map((card)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `${card.color} border rounded-lg p-4 shadow-sm`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `text-sm font-medium ${card.textColor}`,
                        children: card.label
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `text-2xl font-bold ${card.valueColor} mt-1`,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(card.value)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx",
                        lineNumber: 62,
                        columnNumber: 11
                    }, this),
                    card.subLabel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `text-xs ${card.textColor} mt-1 opacity-75`,
                        children: card.subLabel
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx",
                        lineNumber: 66,
                        columnNumber: 13
                    }, this)
                ]
            }, card.label, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx",
                lineNumber: 55,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, this);
}
_s(SummaryCards, "1hqDV+aerUrwrAA/d/ekDc2liwA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = SummaryCards;
var _c;
__turbopack_context__.k.register(_c, "SummaryCards");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/ui/ChevronIcon.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChevronIcon",
    ()=>ChevronIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
'use client';
;
function ChevronIcon({ expanded, className = '' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: `w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''} ${className}`,
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M9 5l7 7-7 7"
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/ui/ChevronIcon.tsx",
            lineNumber: 16,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/components/ui/ChevronIcon.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = ChevronIcon;
var _c;
__turbopack_context__.k.register(_c, "ChevronIcon");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/tagging/TagModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TagModal",
    ()=>TagModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function TagModal({ transaction, onClose }) {
    _s();
    const { state, dispatch } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('personal');
    const [newSubAccount, setNewSubAccount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showNewInput, setShowNewInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleTag = (subAccount)=>{
        dispatch({
            type: 'TAG_TRANSACTION',
            payload: {
                transactionId: transaction.id,
                tag: {
                    category: activeTab,
                    subAccount,
                    taggedAt: Date.now()
                }
            }
        });
        onClose();
    };
    const handleAddNew = ()=>{
        if (newSubAccount.trim()) {
            dispatch({
                type: 'ADD_SUB_ACCOUNT',
                payload: {
                    category: activeTab,
                    name: newSubAccount.trim()
                }
            });
            handleTag(newSubAccount.trim());
        }
    };
    const subAccounts = state.tagConfig[activeTab];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
        onClick: onClose,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4",
            onClick: (e)=>e.stopPropagation(),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 py-3 border-b border-slate-200",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "font-semibold text-slate-900",
                            children: "Tag Transaction"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                            lineNumber: 57,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-slate-500 mt-1 truncate",
                            children: [
                                transaction.name || transaction.memo,
                                " - ",
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(transaction.amount)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                    lineNumber: 56,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex border-b border-slate-200",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: `flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'personal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `,
                            onClick: ()=>setActiveTab('personal'),
                            children: "Personal"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: `flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'nonRecurring' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `,
                            onClick: ()=>setActiveTab('nonRecurring'),
                            children: "Non-Recurring"
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                    lineNumber: 64,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 max-h-64 overflow-y-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            subAccounts.map((subAccount)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>handleTag(subAccount),
                                    className: "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors",
                                    children: subAccount
                                }, subAccount, false, {
                                    fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                    lineNumber: 93,
                                    columnNumber: 15
                                }, this)),
                            !showNewInput ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowNewInput(true),
                                className: "w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-4 h-4",
                                        fill: "none",
                                        stroke: "currentColor",
                                        viewBox: "0 0 24 24",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M12 4v16m8-8H4"
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                            lineNumber: 109,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                        lineNumber: 108,
                                        columnNumber: 17
                                    }, this),
                                    "Add new sub-account"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                lineNumber: 104,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        value: newSubAccount,
                                        onChange: (e)=>setNewSubAccount(e.target.value),
                                        placeholder: "Enter name...",
                                        className: "flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                        autoFocus: true,
                                        onKeyDown: (e)=>{
                                            if (e.key === 'Enter') handleAddNew();
                                            if (e.key === 'Escape') setShowNewInput(false);
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                        lineNumber: 115,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleAddNew,
                                        disabled: !newSubAccount.trim(),
                                        className: "px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                                        children: "Add"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                        lineNumber: 127,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                                lineNumber: 114,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                    lineNumber: 90,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 py-3 border-t border-slate-200 flex justify-end",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "px-4 py-2 text-sm text-slate-600 hover:text-slate-800",
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                        lineNumber: 141,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
                    lineNumber: 140,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
            lineNumber: 51,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/components/tagging/TagModal.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
_s(TagModal, "hCy5zchrB1KfwqW+OM+ww2h1I+U=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = TagModal;
var _c;
__turbopack_context__.k.register(_c, "TagModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TransactionRow",
    ()=>TransactionRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$tagging$2f$TagModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/tagging/TagModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function TransactionRow({ transaction }) {
    _s();
    const { state, dispatch } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const [showTagModal, setShowTagModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const tag = state.tags[transaction.id];
    const isTagged = !!tag;
    const handleUntag = (e)=>{
        e.stopPropagation();
        dispatch({
            type: 'UNTAG_TRANSACTION',
            payload: transaction.id
        });
    };
    const formatDate = (dateStr)=>{
        const [month, day] = dateStr.split('/');
        return `${month}/${day}`;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `
          flex items-center gap-3 py-1.5 px-2 rounded text-sm
          ${isTagged ? 'bg-amber-50 opacity-60' : 'bg-white hover:bg-slate-50'}
        `,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-slate-400 font-mono text-xs w-12 flex-shrink-0",
                        children: formatDate(transaction.transactionDate)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `font-medium w-32 flex-shrink-0 truncate ${isTagged ? 'line-through text-slate-400' : 'text-slate-700'}`,
                        children: transaction.name || '-'
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `flex-1 truncate ${isTagged ? 'line-through text-slate-400' : 'text-slate-500'}`,
                        children: transaction.memo || transaction.transactionType
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this),
                    isTagged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                        children: tag.subAccount
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 55,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `font-mono text-right w-24 flex-shrink-0
          ${isTagged ? 'line-through text-slate-400' : transaction.amount < 0 ? 'text-red-600' : 'text-slate-700'}
        `,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(transaction.amount)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this),
                    isTagged ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleUntag,
                        className: "text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 flex-shrink-0",
                        children: "Untag"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 69,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation();
                            setShowTagModal(true);
                        },
                        className: "text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 flex-shrink-0",
                        children: "Tag"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                        lineNumber: 76,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            showTagModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$tagging$2f$TagModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TagModal"], {
                transaction: transaction,
                onClose: ()=>setShowTagModal(false)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx",
                lineNumber: 90,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s(TransactionRow, "Hhia5SMD3BO9MrWSVHEKzxFhuMU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = TransactionRow;
var _c;
__turbopack_context__.k.register(_c, "TransactionRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/pnl/PLRow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLRow",
    ()=>PLRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/ui/ChevronIcon.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$TransactionRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/pnl/TransactionRow.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function PLRow({ row, months, depth = 0, isChild = false }) {
    _s();
    const { state, dispatch } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const { expandedAccounts, expandedMonths, transactions, accounts, tags } = state;
    const isExpanded = expandedAccounts.has(row.accountCode);
    const hasChildren = row.account.children.length > 0;
    const hasTransactions = row.transactionCount > 0;
    const isExpandable = hasChildren || hasTransactions;
    // Get child rows if expanded
    const childRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PLRow.useMemo[childRows]": ()=>{
            if (!isExpanded || !hasChildren) return [];
            return row.account.children.map({
                "PLRow.useMemo[childRows]": (childCode)=>{
                    const childAccount = accounts.get(childCode);
                    if (!childAccount) return null;
                    const { monthlyAmounts, ytdTotal, transactionCount } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateMonthlyAmounts"])(childCode, transactions, accounts, months, tags);
                    if (ytdTotal === 0 && transactionCount === 0) return null;
                    return {
                        accountCode: childCode,
                        account: childAccount,
                        monthlyAmounts,
                        ytdTotal,
                        transactionCount
                    };
                }
            }["PLRow.useMemo[childRows]"]).filter({
                "PLRow.useMemo[childRows]": (r)=>r !== null
            }["PLRow.useMemo[childRows]"]);
        }
    }["PLRow.useMemo[childRows]"], [
        isExpanded,
        hasChildren,
        row.account.children,
        accounts,
        transactions,
        months,
        tags
    ]);
    // Get transactions grouped by month if expanded (only for leaf nodes)
    const transactionsByMonth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PLRow.useMemo[transactionsByMonth]": ()=>{
            if (!isExpanded || hasChildren) return {};
            const txns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccountTransactions"])(row.accountCode, transactions, accounts, tags);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["groupTransactionsByMonth"])(txns);
        }
    }["PLRow.useMemo[transactionsByMonth]"], [
        isExpanded,
        hasChildren,
        row.accountCode,
        transactions,
        accounts,
        tags
    ]);
    const handleToggle = ()=>{
        if (isExpandable) {
            dispatch({
                type: 'TOGGLE_ACCOUNT',
                payload: row.accountCode
            });
        }
    };
    const handleMonthToggle = (month)=>{
        const key = `${row.accountCode}-${month}`;
        dispatch({
            type: 'TOGGLE_MONTH',
            payload: key
        });
    };
    const isMonthExpanded = (month)=>{
        return expandedMonths.has(`${row.accountCode}-${month}`);
    };
    const indentPadding = depth * 20;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                className: `
          ${isChild ? 'bg-slate-50/50' : 'bg-white'}
          ${isExpandable ? 'cursor-pointer hover:bg-slate-100' : ''}
          border-b border-slate-100
        `,
                onClick: handleToggle,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                        className: "sticky left-0 bg-inherit px-3 py-2 font-medium text-slate-900 whitespace-nowrap z-10",
                        style: {
                            paddingLeft: `${12 + indentPadding}px`
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                isExpandable ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronIcon"], {
                                    expanded: isExpanded,
                                    className: "text-slate-400 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                    lineNumber: 96,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "w-4"
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                    lineNumber: 98,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: depth > 0 ? 'text-sm' : '',
                                    children: row.account.name
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                    lineNumber: 100,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                            lineNumber: 94,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    months.map((month)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: `px-3 py-2 text-right font-mono text-sm whitespace-nowrap
              ${row.monthlyAmounts[month] < 0 ? 'text-red-600' : 'text-slate-700'}
            `,
                            children: row.monthlyAmounts[month] !== 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(row.monthlyAmounts[month]) : '-'
                        }, month, false, {
                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                            lineNumber: 108,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                        className: `px-3 py-2 text-right font-mono text-sm font-semibold whitespace-nowrap
            ${row.ytdTotal < 0 ? 'text-red-600' : 'text-slate-900'}
          `,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(row.ytdTotal)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this),
            isExpanded && childRows.map((childRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PLRow, {
                    row: childRow,
                    months: months,
                    depth: depth + 1,
                    isChild: true
                }, childRow.accountCode, false, {
                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                    lineNumber: 130,
                    columnNumber: 9
                }, this)),
            isExpanded && !hasChildren && Object.keys(transactionsByMonth).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: months.filter((m)=>transactionsByMonth[m]?.length > 0).map((month)=>{
                    const monthTxns = transactionsByMonth[month] || [];
                    const monthExpanded = isMonthExpanded(month);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                        className: "bg-slate-50",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            colSpan: months.length + 2,
                            className: "px-3 py-1",
                            style: {
                                paddingLeft: `${32 + indentPadding}px`
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900",
                                    onClick: (e)=>{
                                        e.stopPropagation();
                                        handleMonthToggle(month);
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronIcon"], {
                                            expanded: monthExpanded,
                                            className: "text-slate-400"
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                            lineNumber: 160,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMonth"])(month)
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                            lineNumber: 161,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-slate-400",
                                            children: [
                                                "(",
                                                monthTxns.length,
                                                " transactions)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                            lineNumber: 162,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto font-mono",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(monthTxns.reduce((sum, t)=>sum + t.amount, 0))
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                            lineNumber: 163,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                    lineNumber: 153,
                                    columnNumber: 19
                                }, this),
                                monthExpanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2 space-y-1 pb-2",
                                    children: monthTxns.map((txn)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$TransactionRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TransactionRow"], {
                                            transaction: txn
                                        }, txn.id, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                            lineNumber: 172,
                                            columnNumber: 25
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                                    lineNumber: 170,
                                    columnNumber: 21
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                            lineNumber: 148,
                            columnNumber: 17
                        }, this)
                    }, `${row.accountCode}-${month}-group`, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLRow.tsx",
                        lineNumber: 147,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false)
        ]
    }, void 0, true);
}
_s(PLRow, "jSueisDo0NHFz2lCIugoD0jwkM8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = PLRow;
var _c;
__turbopack_context__.k.register(_c, "PLRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/pnl/PLSection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLSection",
    ()=>PLSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/pnl/PLRow.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function PLSection({ section, title, colorClass }) {
    _s();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const { transactions, accounts, months, tags } = state;
    const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PLSection.useMemo[rows]": ()=>{
            if (transactions.length === 0) return [];
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildPLRows"])(section, transactions, accounts, months, tags);
        }
    }["PLSection.useMemo[rows]"], [
        section,
        transactions,
        accounts,
        months,
        tags
    ]);
    const sectionTotals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PLSection.useMemo[sectionTotals]": ()=>{
            const totals = {};
            let ytd = 0;
            months.forEach({
                "PLSection.useMemo[sectionTotals]": (month)=>{
                    const total = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])(section, transactions, accounts, month, tags);
                    totals[month] = total;
                    ytd += total;
                }
            }["PLSection.useMemo[sectionTotals]"]);
            return {
                monthly: totals,
                ytd
            };
        }
    }["PLSection.useMemo[sectionTotals]"], [
        section,
        transactions,
        accounts,
        months,
        tags
    ]);
    if (rows.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `flex items-center gap-3 mb-2`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `w-1 h-6 rounded ${colorClass}`
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold text-slate-900",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "overflow-x-auto border border-slate-200 rounded-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full min-w-max",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: "bg-slate-50 border-b border-slate-200",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "sticky left-0 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64 z-10",
                                        children: "Account"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                        lineNumber: 53,
                                        columnNumber: 15
                                    }, this),
                                    months.map((month)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMonth"])(month)
                                        }, month, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                            lineNumber: 57,
                                            columnNumber: 17
                                        }, this)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28 bg-slate-100",
                                        children: "YTD Total"
                                    }, void 0, false, {
                                        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                        lineNumber: 64,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                lineNumber: 52,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            children: [
                                rows.map((row)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLRow"], {
                                        row: row,
                                        months: months
                                    }, row.accountCode, false, {
                                        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                        lineNumber: 71,
                                        columnNumber: 15
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: `${colorClass.replace('bg-', 'bg-opacity-10 bg-')} border-t-2 border-slate-300`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "sticky left-0 bg-inherit px-3 py-2 font-bold text-slate-900",
                                            children: [
                                                "Total ",
                                                title
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                            lineNumber: 76,
                                            columnNumber: 15
                                        }, this),
                                        months.map((month)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: `px-3 py-2 text-right font-mono text-sm font-bold
                    ${sectionTotals.monthly[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                  `,
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(sectionTotals.monthly[month])
                                            }, month, false, {
                                                fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                                lineNumber: 80,
                                                columnNumber: 17
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: `px-3 py-2 text-right font-mono text-sm font-bold bg-slate-100
                  ${sectionTotals.ytd < 0 ? 'text-red-600' : 'text-slate-900'}
                `,
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(sectionTotals.ytd)
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                            lineNumber: 89,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                                    lineNumber: 75,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                    lineNumber: 50,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/pnl/PLSection.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this);
}
_s(PLSection, "gjtB3WfF1gqPdXqRx8FrW5cFKHM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = PLSection;
var _c;
__turbopack_context__.k.register(_c, "PLSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GrossProfitRow",
    ()=>GrossProfitRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/calculations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function GrossProfitRow({ type }) {
    _s();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const { transactions, accounts, months, tags } = state;
    const calculations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "GrossProfitRow.useMemo[calculations]": ()=>{
            const revenue = {};
            const cogs = {};
            const costOfSales = {};
            const opex = {};
            const other = {};
            let revenueYtd = 0, cogsYtd = 0, cosYtd = 0, opexYtd = 0, otherYtd = 0;
            months.forEach({
                "GrossProfitRow.useMemo[calculations]": (month)=>{
                    revenue[month] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('revenue', transactions, accounts, month, tags);
                    cogs[month] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('cogs', transactions, accounts, month, tags);
                    costOfSales[month] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('costOfSales', transactions, accounts, month, tags);
                    opex[month] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('operatingExpenses', transactions, accounts, month, tags);
                    other[month] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$calculations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateSectionMonthlyTotal"])('otherIncome', transactions, accounts, month, tags);
                    revenueYtd += revenue[month];
                    cogsYtd += cogs[month];
                    cosYtd += costOfSales[month];
                    opexYtd += opex[month];
                    otherYtd += other[month];
                }
            }["GrossProfitRow.useMemo[calculations]"]);
            const grossProfit = {};
            const netIncome = {};
            let gpYtd = 0, niYtd = 0;
            months.forEach({
                "GrossProfitRow.useMemo[calculations]": (month)=>{
                    grossProfit[month] = revenue[month] - cogs[month] - costOfSales[month];
                    netIncome[month] = grossProfit[month] - opex[month] + other[month];
                    gpYtd += grossProfit[month];
                    niYtd += netIncome[month];
                }
            }["GrossProfitRow.useMemo[calculations]"]);
            return {
                grossProfit: {
                    monthly: grossProfit,
                    ytd: gpYtd
                },
                netIncome: {
                    monthly: netIncome,
                    ytd: niYtd
                },
                revenue: {
                    monthly: revenue,
                    ytd: revenueYtd
                }
            };
        }
    }["GrossProfitRow.useMemo[calculations]"], [
        transactions,
        accounts,
        months,
        tags
    ]);
    if (transactions.length === 0) return null;
    const data = type === 'grossProfit' ? calculations.grossProfit : calculations.netIncome;
    const label = type === 'grossProfit' ? 'Gross Profit' : 'Net Income';
    const bgColor = type === 'grossProfit' ? 'bg-blue-50' : 'bg-green-50';
    const borderColor = type === 'grossProfit' ? 'border-blue-200' : 'border-green-200';
    // Calculate margin
    const margin = calculations.revenue.ytd !== 0 ? data.ytd / calculations.revenue.ytd * 100 : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `mb-6 overflow-x-auto border ${borderColor} rounded-lg`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            className: "w-full min-w-max",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                        className: `${bgColor} border-b ${borderColor}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "sticky left-0 bg-inherit px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64 z-10",
                                children: " "
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                lineNumber: 74,
                                columnNumber: 13
                            }, this),
                            months.map((month)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMonth"])(month)
                                }, month, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                    lineNumber: 78,
                                    columnNumber: 15
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                className: "px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28",
                                children: "YTD Total"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                lineNumber: 85,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                        lineNumber: 73,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                    lineNumber: 72,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                        className: bgColor,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "sticky left-0 bg-inherit px-3 py-3 font-bold text-lg text-slate-900",
                                children: [
                                    label,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ml-2 text-sm font-normal text-slate-500",
                                        children: [
                                            "(",
                                            margin.toFixed(1),
                                            "% margin)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                        lineNumber: 94,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                lineNumber: 92,
                                columnNumber: 13
                            }, this),
                            months.map((month)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                    className: `px-3 py-3 text-right font-mono font-bold text-lg
                  ${data.monthly[month] < 0 ? 'text-red-600' : 'text-slate-900'}
                `,
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(data.monthly[month])
                                }, month, false, {
                                    fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                    lineNumber: 99,
                                    columnNumber: 15
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: `px-3 py-3 text-right font-mono font-bold text-lg
                ${data.ytd < 0 ? 'text-red-600' : 'text-slate-900'}
              `,
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(data.ytd)
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                                lineNumber: 108,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
                    lineNumber: 90,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
            lineNumber: 71,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
_s(GrossProfitRow, "gaE545S2SqDKxqx669rflomCsSA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = GrossProfitRow;
var _c;
__turbopack_context__.k.register(_c, "GrossProfitRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExcludedSection",
    ()=>ExcludedSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/ui/ChevronIcon.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function ExcludedSection() {
    _s();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    const [isMainExpanded, setIsMainExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [expandedCategories, setExpandedCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const grouped = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExcludedSection.useMemo[grouped]": ()=>{
            const result = {};
            for (const exclusion of state.exclusions){
                if (!result[exclusion.category]) {
                    result[exclusion.category] = {
                        exclusions: [],
                        total: 0,
                        justification: exclusion.justification
                    };
                }
                result[exclusion.category].exclusions.push(exclusion);
                result[exclusion.category].total += exclusion.amount;
            }
            return result;
        }
    }["ExcludedSection.useMemo[grouped]"], [
        state.exclusions
    ]);
    const totalExcluded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExcludedSection.useMemo[totalExcluded]": ()=>{
            return state.exclusions.reduce({
                "ExcludedSection.useMemo[totalExcluded]": (sum, e)=>sum + e.amount
            }["ExcludedSection.useMemo[totalExcluded]"], 0);
        }
    }["ExcludedSection.useMemo[totalExcluded]"], [
        state.exclusions
    ]);
    const categories = Object.keys(grouped).sort();
    if (state.exclusions.length === 0) return null;
    const toggleCategory = (category)=>{
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };
    // Category colors
    const getCategoryColor = (category)=>{
        const colors = {
            'Personal': 'bg-purple-500',
            'Discretionary': 'bg-purple-400',
            'Owner Travel': 'bg-blue-500',
            'Owner Education': 'bg-blue-400',
            'Owner Tools': 'bg-blue-300',
            'Owner Expense': 'bg-blue-600',
            'Legal': 'bg-red-500',
            'Legal/Tax': 'bg-red-400',
            'One-Time Project': 'bg-amber-500',
            'One-Time COGS': 'bg-amber-400',
            'Terminated Agency': 'bg-orange-500',
            'Terminated Contractor': 'bg-orange-400',
            'Terminated Service': 'bg-orange-300',
            'M&A Process': 'bg-slate-500'
        };
        return colors[category] || 'bg-slate-400';
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-8 pt-6 border-t-2 border-slate-300",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80",
                onClick: ()=>setIsMainExpanded(!isMainExpanded),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronIcon"], {
                        expanded: isMainExpanded,
                        className: "text-slate-400"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 86,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-1 h-6 rounded bg-amber-500"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold text-slate-900",
                        children: "Exclusions"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm text-slate-500",
                        children: [
                            "(",
                            state.exclusions.length,
                            " items excluded from P&L)"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 89,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "ml-auto font-mono font-semibold text-slate-700",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(totalExcluded)
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 92,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this),
            isMainExpanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3 pl-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-slate-600 mb-4",
                        children: "The following expenses have been excluded as non-recurring or owner-related items that would not transfer to a buyer."
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                        lineNumber: 100,
                        columnNumber: 11
                    }, this),
                    categories.map((category)=>{
                        const data = grouped[category];
                        const isExpanded = expandedCategories.has(category);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border border-slate-200 rounded-lg overflow-hidden",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100",
                                    onClick: ()=>toggleCategory(category),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$ui$2f$ChevronIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronIcon"], {
                                            expanded: isExpanded,
                                            className: "text-slate-400"
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 115,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `w-2 h-2 rounded-full ${getCategoryColor(category)}`
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 116,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold text-slate-900",
                                            children: category
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 117,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-slate-500",
                                            children: [
                                                "(",
                                                data.exclusions.length,
                                                " items)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 118,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto text-xs text-slate-500 max-w-md truncate",
                                            children: data.justification
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 121,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-mono font-semibold text-slate-700 ml-4",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(data.total)
                                        }, void 0, false, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 124,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                    lineNumber: 111,
                                    columnNumber: 17
                                }, this),
                                isExpanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "divide-y divide-slate-100",
                                    children: data.exclusions.map((exc, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-4 px-6 py-2 bg-white text-sm hover:bg-slate-50",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-400 w-24",
                                                    children: exc.date
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                                    lineNumber: 137,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-700 flex-1 truncate",
                                                    children: exc.vendor || exc.memo?.substring(0, 40) || 'Unknown'
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                                    lineNumber: 138,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-500 text-xs w-32 truncate",
                                                    children: exc.account.replace(/^\d{4}\s+/, '')
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                                    lineNumber: 141,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-mono text-slate-600 w-24 text-right",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(exc.amount)
                                                }, void 0, false, {
                                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                                    lineNumber: 144,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, `${exc.date}-${exc.amount}-${idx}`, true, {
                                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                            lineNumber: 133,
                                            columnNumber: 23
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                                    lineNumber: 131,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, category, true, {
                            fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                            lineNumber: 109,
                            columnNumber: 15
                        }, this);
                    })
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
                lineNumber: 98,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx",
        lineNumber: 80,
        columnNumber: 5
    }, this);
}
_s(ExcludedSection, "RP5p/NLSYIkYYl8cCY3uAq8OLKw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = ExcludedSection;
var _c;
__turbopack_context__.k.register(_c, "ExcludedSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/spicy-pnl/src/components/pnl/PLViewer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLViewer",
    ()=>PLViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/context/PLContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$SummaryCards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/pnl/SummaryCards.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/pnl/PLSection.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$GrossProfitRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/pnl/GrossProfitRow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$tagging$2f$ExcludedSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/components/tagging/ExcludedSection.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function PLViewer() {
    _s();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"])();
    if (state.loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-64",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 text-slate-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        className: "animate-spin h-5 w-5",
                        xmlns: "http://www.w3.org/2000/svg",
                        fill: "none",
                        viewBox: "0 0 24 24",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                className: "opacity-25",
                                cx: "12",
                                cy: "12",
                                r: "10",
                                stroke: "currentColor",
                                strokeWidth: "4"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                                lineNumber: 17,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "opacity-75",
                                fill: "currentColor",
                                d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            }, void 0, false, {
                                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                                lineNumber: 18,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                        lineNumber: 16,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Loading financial data..."
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                        lineNumber: 20,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 15,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
            lineNumber: 14,
            columnNumber: 7
        }, this);
    }
    if (state.error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-64",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-red-600 bg-red-50 px-6 py-4 rounded-lg border border-red-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Error:"
                    }, void 0, false, {
                        fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    " ",
                    state.error
                ]
            }, void 0, true, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
            lineNumber: 28,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$SummaryCards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SummaryCards"], {}, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLSection"], {
                section: "revenue",
                title: "Revenue",
                colorClass: "bg-emerald-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLSection"], {
                section: "cogs",
                title: "Cost of Goods Sold",
                colorClass: "bg-orange-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLSection"], {
                section: "costOfSales",
                title: "Cost of Sales",
                colorClass: "bg-amber-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$GrossProfitRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GrossProfitRow"], {
                type: "grossProfit"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$PLSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLSection"], {
                section: "operatingExpenses",
                title: "Operating Expenses",
                colorClass: "bg-red-500"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$pnl$2f$GrossProfitRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GrossProfitRow"], {
                type: "netIncome"
            }, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$components$2f$tagging$2f$ExcludedSection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExcludedSection"], {}, void 0, false, {
                fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/spicy-pnl/src/components/pnl/PLViewer.tsx",
        lineNumber: 37,
        columnNumber: 5
    }, this);
}
_s(PLViewer, "t3C4XHe/VIpGUxC7e9uzp3B8G2M=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$context$2f$PLContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePL"]
    ];
});
_c = PLViewer;
var _c;
__turbopack_context__.k.register(_c, "PLViewer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=spicy-pnl_src_9f7fe411._.js.map