module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/spicy-pnl/src/lib/csvParser.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatCurrency",
    ()=>formatCurrency,
    "formatMonth",
    ()=>formatMonth,
    "parseCSV",
    ()=>parseCSV
]);
// Parse a CSV line handling quoted fields with commas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for(let i = 0; i < line.length; i++){
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
// Parse amount string to number (handles commas, quotes, negative values)
function parseAmount(str) {
    if (!str || str.trim() === '') return 0;
    const cleaned = str.replace(/[$,"]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}
// Parse date to YYYY-MM format
function parseMonth(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const month = parts[0].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}`;
}
// Extract account code from account full name
function extractAccountCode(accountFullName) {
    if (!accountFullName) return {
        code: '',
        parentCode: null
    };
    const parts = accountFullName.split(':');
    if (parts.length === 1) {
        // Single account like "4000 Sales"
        const match = accountFullName.match(/^(\d{4})/);
        return {
            code: match ? match[1] : '',
            parentCode: null
        };
    }
    // Hierarchical like "6000 Cost of Sales:6065 Shopify Merchant Fees"
    const lastPart = parts[parts.length - 1].trim();
    const parentPart = parts[0].trim();
    const codeMatch = lastPart.match(/^(\d{4})/);
    const parentMatch = parentPart.match(/^(\d{4})/);
    return {
        code: codeMatch ? codeMatch[1] : '',
        parentCode: parentMatch ? parentMatch[1] : null
    };
}
// Check if code is a P&L account (4000-7999)
function isPnLAccount(code) {
    const num = parseInt(code, 10);
    return num >= 4000 && num < 8000;
}
// Extract code from section header
function extractSectionCode(sectionHeader) {
    const match = sectionHeader.match(/^(\d{4})/);
    return match ? match[1] : '';
}
// Classify account by code
function classifyAccount(code) {
    const numCode = parseInt(code, 10);
    if (numCode >= 4000 && numCode < 4100) return 'revenue';
    if (numCode >= 5000 && numCode < 6000) return 'cogs';
    if (numCode >= 6000 && numCode < 6100) return 'costOfSales';
    if (numCode >= 6100 && numCode < 7000) return 'operatingExpenses';
    if (numCode >= 7000 && numCode < 8000) return 'otherIncome';
    return 'operatingExpenses';
}
// Generate unique transaction ID
function generateTransactionId(txn, index) {
    const date = txn.transactionDate.replace(/\//g, '-');
    const account = txn.accountFullName.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    return `txn-${date}-${account}-${index}`;
}
// Extract account name from code and full name
function extractAccountName(fullName) {
    const parts = fullName.split(':');
    const lastPart = parts[parts.length - 1].trim();
    // Remove the code prefix (e.g., "6065 Shopify Merchant Fees" -> "Shopify Merchant Fees")
    return lastPart.replace(/^\d{4}\s+/, '');
}
function parseCSV(csvContent) {
    // Normalize line endings (handle Windows \r\n)
    const normalizedContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    const rawTransactions = [];
    const accountsMap = new Map();
    const monthsSet = new Set();
    // Track current section header and its code
    // KEY INSIGHT: This is a double-entry accounting export. Each transaction appears twice:
    // once under the bank/credit card account, once under the P&L account.
    // We ONLY want transactions from P&L sections (4xxx-7xxx), using the section header as the account.
    // Column 8 shows the OFFSETTING account (bank), not the P&L account.
    let currentSection = null;
    let currentSectionCode = null;
    // Skip header rows (first 5 lines)
    for(let i = 5; i < lines.length; i++){
        const line = lines[i].trim();
        // Skip empty lines
        if (!line || line === ',,,,,,,,,') continue;
        // Skip total rows
        if (line.startsWith('Total for')) continue;
        // Check for ANY section header (lines ending with ,,,,,,,,,)
        // These can be numeric like "4000 Sales,,,,,,,,," or non-numeric like "Credit Card,,,,,,,,,"
        // We need to detect ALL headers to properly exit P&L sections when entering non-P&L sections
        const sectionMatch = line.match(/^([^,]+),,,,,,,,,$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim();
            currentSectionCode = extractSectionCode(currentSection);
            continue;
        }
        // Skip if we're not in a P&L section (only include 4xxx-7xxx accounts)
        if (!currentSectionCode || !isPnLAccount(currentSectionCode)) {
            continue;
        }
        // Parse the line
        const fields = parseCSVLine(line);
        // Transaction rows start with empty first field and have a date in second field
        const dateField = fields[1];
        if (!dateField || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) continue;
        // ALWAYS use the current section as the account
        // This is the KEY FIX - column 8 shows the offsetting bank account, not the P&L account
        const accountFullName = currentSection;
        const raw = {
            transactionDate: dateField,
            transactionType: fields[2] || '',
            num: fields[3] || '',
            name: fields[4] || '',
            classFullName: fields[5] || '',
            memo: fields[6] || '',
            accountFullName: accountFullName,
            amount: parseAmount(fields[8]),
            balance: parseAmount(fields[9])
        };
        rawTransactions.push(raw);
    }
    // Process transactions and build accounts
    const transactions = rawTransactions.map((raw, index)=>{
        const { code, parentCode } = extractAccountCode(raw.accountFullName);
        const month = parseMonth(raw.transactionDate);
        if (month) monthsSet.add(month);
        // Build account if not exists
        if (code && !accountsMap.has(code)) {
            accountsMap.set(code, {
                code,
                name: extractAccountName(raw.accountFullName),
                fullName: raw.accountFullName,
                parentCode,
                section: classifyAccount(code),
                children: [],
                depth: parentCode ? 1 : 0
            });
        }
        // Update parent's children
        if (parentCode && code) {
            const parent = accountsMap.get(parentCode);
            if (parent && !parent.children.includes(code)) {
                parent.children.push(code);
            } else if (!parent) {
                // Create parent account stub
                const parts = raw.accountFullName.split(':');
                const parentPart = parts[0].trim();
                accountsMap.set(parentCode, {
                    code: parentCode,
                    name: extractAccountName(parentPart),
                    fullName: parentPart,
                    parentCode: null,
                    section: classifyAccount(parentCode),
                    children: [
                        code
                    ],
                    depth: 0
                });
            }
        }
        return {
            ...raw,
            id: generateTransactionId(raw, index),
            month,
            accountCode: code,
            parentAccountCode: parentCode
        };
    });
    // Sort months chronologically
    const months = Array.from(monthsSet).sort();
    return {
        transactions,
        accounts: accountsMap,
        months
    };
}
function formatCurrency(amount) {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(absAmount);
    return amount < 0 ? `(${formatted})` : formatted;
}
function formatMonth(month) {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit'
    });
}
}),
"[project]/spicy-pnl/src/context/PLContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLProvider",
    ()=>PLProvider,
    "usePL",
    ()=>usePL
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/spicy-pnl/src/lib/csvParser.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
const initialState = {
    transactions: [],
    accounts: new Map(),
    tags: {},
    tagConfig: {
        personal: [
            "Owner's Draw",
            "Personal Meals",
            "Personal Travel",
            "Personal Shopping"
        ],
        nonRecurring: [
            "One-time Setup",
            "Settlement",
            "Equipment Purchase",
            "Legal Settlement"
        ]
    },
    expandedAccounts: new Set(),
    expandedMonths: new Set(),
    months: [],
    loading: true,
    error: null
};
function plReducer(state, action) {
    switch(action.type){
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false
            };
        case 'LOAD_DATA':
            return {
                ...state,
                transactions: action.payload.transactions,
                accounts: action.payload.accounts,
                months: action.payload.months,
                loading: false,
                error: null
            };
        case 'TOGGLE_ACCOUNT':
            {
                const newExpanded = new Set(state.expandedAccounts);
                if (newExpanded.has(action.payload)) {
                    newExpanded.delete(action.payload);
                } else {
                    newExpanded.add(action.payload);
                }
                return {
                    ...state,
                    expandedAccounts: newExpanded
                };
            }
        case 'TOGGLE_MONTH':
            {
                const newExpanded = new Set(state.expandedMonths);
                if (newExpanded.has(action.payload)) {
                    newExpanded.delete(action.payload);
                } else {
                    newExpanded.add(action.payload);
                }
                return {
                    ...state,
                    expandedMonths: newExpanded
                };
            }
        case 'TAG_TRANSACTION':
            return {
                ...state,
                tags: {
                    ...state.tags,
                    [action.payload.transactionId]: action.payload.tag
                }
            };
        case 'UNTAG_TRANSACTION':
            {
                const newTags = {
                    ...state.tags
                };
                delete newTags[action.payload];
                return {
                    ...state,
                    tags: newTags
                };
            }
        case 'ADD_SUB_ACCOUNT':
            {
                const { category, name } = action.payload;
                if (state.tagConfig[category].includes(name)) {
                    return state;
                }
                return {
                    ...state,
                    tagConfig: {
                        ...state.tagConfig,
                        [category]: [
                            ...state.tagConfig[category],
                            name
                        ]
                    }
                };
            }
        case 'LOAD_TAGS':
            return {
                ...state,
                tags: action.payload.tags,
                tagConfig: action.payload.config
            };
        default:
            return state;
    }
}
const PLContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
const TAGS_STORAGE_KEY = 'pnl-tags';
const CONFIG_STORAGE_KEY = 'pnl-tag-config';
function PLProvider({ children }) {
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducer"])(plReducer, initialState);
    // Load CSV data on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        async function loadData() {
            try {
                dispatch({
                    type: 'SET_LOADING',
                    payload: true
                });
                const response = await fetch('/all-txn.csv');
                if (!response.ok) {
                    throw new Error('Failed to load CSV file');
                }
                const csvContent = await response.text();
                const { transactions, accounts, months } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$src$2f$lib$2f$csvParser$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseCSV"])(csvContent);
                dispatch({
                    type: 'LOAD_DATA',
                    payload: {
                        transactions,
                        accounts,
                        months
                    }
                });
            } catch (error) {
                dispatch({
                    type: 'SET_ERROR',
                    payload: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        loadData();
    }, []);
    // Load tags from localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        try {
            const savedTags = localStorage.getItem(TAGS_STORAGE_KEY);
            const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (savedTags || savedConfig) {
                dispatch({
                    type: 'LOAD_TAGS',
                    payload: {
                        tags: savedTags ? JSON.parse(savedTags) : {},
                        config: savedConfig ? JSON.parse(savedConfig) : initialState.tagConfig
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load tags from localStorage:', error);
        }
    }, []);
    // Save tags to localStorage when they change
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!state.loading) {
            try {
                localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(state.tags));
                localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.tagConfig));
            } catch (error) {
                console.error('Failed to save tags to localStorage:', error);
            }
        }
    }, [
        state.tags,
        state.tagConfig,
        state.loading
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PLContext.Provider, {
        value: {
            state,
            dispatch
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/spicy-pnl/src/context/PLContext.tsx",
        lineNumber: 176,
        columnNumber: 5
    }, this);
}
function usePL() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$spicy$2d$pnl$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(PLContext);
    if (!context) {
        throw new Error('usePL must be used within a PLProvider');
    }
    return context;
}
}),
"[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/spicy-pnl/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__11931fff._.js.map