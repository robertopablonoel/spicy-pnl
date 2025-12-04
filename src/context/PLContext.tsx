'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { PLState, PLAction, TransactionTag, TagConfig, Exclusion, Transaction } from '@/types';
import { parseCSV } from '@/lib/csvParser';

const initialState: PLState = {
  transactions: [],
  accounts: new Map(),
  tags: {},
  tagConfig: {
    personal: ["Owner's Draw", "Personal Meals", "Personal Travel", "Personal Shopping"],
    nonRecurring: ["One-time Setup", "Settlement", "Equipment Purchase", "Legal Settlement"]
  },
  expandedAccounts: new Set(),
  expandedMonths: new Set(),
  months: [],
  exclusions: [],
  loading: true,
  error: null
};

// Parse exclusions CSV
function parseExclusionsCSV(csvContent: string): Exclusion[] {
  const lines = csvContent.trim().split('\n');
  const exclusions: Exclusion[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line handling quoted fields
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

    if (fields.length >= 8) {
      exclusions.push({
        date: fields[0],
        vendor: fields[1],
        memo: fields[2],
        account: fields[3],
        accountCode: fields[4],
        amount: parseFloat(fields[5]) || 0,
        category: fields[6],
        justification: fields[7]
      });
    }
  }

  return exclusions;
}

// Match exclusions to transactions
function matchExclusionsToTransactions(
  exclusions: Exclusion[],
  transactions: Transaction[]
): { matchedExclusions: Exclusion[]; tags: Record<string, TransactionTag> } {
  const tags: Record<string, TransactionTag> = {};
  const matchedExclusions: Exclusion[] = [];

  for (const exclusion of exclusions) {
    // Find matching transaction by date, amount, and account code
    const matchingTxn = transactions.find(txn => {
      const txnDate = txn.transactionDate;
      const amountMatch = Math.abs(txn.amount - exclusion.amount) < 0.01;
      const dateMatch = txnDate === exclusion.date;
      const accountMatch = txn.accountCode === exclusion.accountCode;

      // Also check if not already tagged
      return dateMatch && amountMatch && accountMatch && !tags[txn.id];
    });

    if (matchingTxn) {
      // Tag the transaction
      tags[matchingTxn.id] = {
        category: exclusion.category.includes('Personal') || exclusion.category === 'Discretionary' ? 'personal' : 'nonRecurring',
        subAccount: exclusion.category,
        taggedAt: Date.now()
      };

      matchedExclusions.push({
        ...exclusion,
        transactionId: matchingTxn.id
      });
    }
  }

  return { matchedExclusions, tags };
}

function plReducer(state: PLState, action: PLAction): PLState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'LOAD_DATA':
      return {
        ...state,
        transactions: action.payload.transactions,
        accounts: action.payload.accounts,
        months: action.payload.months,
        exclusions: action.payload.exclusions,
        loading: false,
        error: null
      };

    case 'TOGGLE_ACCOUNT': {
      const newExpanded = new Set(state.expandedAccounts);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedAccounts: newExpanded };
    }

    case 'TOGGLE_MONTH': {
      const newExpanded = new Set(state.expandedMonths);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedMonths: newExpanded };
    }

    case 'TAG_TRANSACTION':
      return {
        ...state,
        tags: {
          ...state.tags,
          [action.payload.transactionId]: action.payload.tag
        }
      };

    case 'UNTAG_TRANSACTION': {
      const newTags = { ...state.tags };
      delete newTags[action.payload];
      return { ...state, tags: newTags };
    }

    case 'ADD_SUB_ACCOUNT': {
      const { category, name } = action.payload;
      if (state.tagConfig[category].includes(name)) {
        return state;
      }
      return {
        ...state,
        tagConfig: {
          ...state.tagConfig,
          [category]: [...state.tagConfig[category], name]
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

interface PLContextValue {
  state: PLState;
  dispatch: React.Dispatch<PLAction>;
}

const PLContext = createContext<PLContextValue | null>(null);

const TAGS_STORAGE_KEY = 'pnl-tags';
const CONFIG_STORAGE_KEY = 'pnl-tag-config';

export function PLProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plReducer, initialState);

  // Load CSV data on mount
  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Load both CSVs in parallel
        const [txnResponse, exclusionsResponse] = await Promise.all([
          fetch('/all-txn.csv'),
          fetch('/exclusions.csv')
        ]);

        if (!txnResponse.ok) {
          throw new Error('Failed to load transaction CSV file');
        }

        const csvContent = await txnResponse.text();
        const { transactions: allTransactions, accounts, months: allMonths } = parseCSV(csvContent);

        // Filter out December - not relevant for P&L display
        const transactions = allTransactions.filter(t => !t.month.endsWith('-12'));
        const months = allMonths.filter(m => !m.endsWith('-12'));

        // Parse exclusions if available
        let exclusions: Exclusion[] = [];
        let exclusionTags: Record<string, TransactionTag> = {};

        if (exclusionsResponse.ok) {
          const exclusionsContent = await exclusionsResponse.text();
          const rawExclusions = parseExclusionsCSV(exclusionsContent);
          const matched = matchExclusionsToTransactions(rawExclusions, transactions);
          exclusions = matched.matchedExclusions;
          exclusionTags = matched.tags;
        }

        dispatch({
          type: 'LOAD_DATA',
          payload: { transactions, accounts, months, exclusions }
        });

        // Apply exclusion tags
        if (Object.keys(exclusionTags).length > 0) {
          dispatch({
            type: 'LOAD_TAGS',
            payload: {
              tags: exclusionTags,
              config: initialState.tagConfig
            }
          });
        }
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
  useEffect(() => {
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
  useEffect(() => {
    if (!state.loading) {
      try {
        localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(state.tags));
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.tagConfig));
      } catch (error) {
        console.error('Failed to save tags to localStorage:', error);
      }
    }
  }, [state.tags, state.tagConfig, state.loading]);

  return (
    <PLContext.Provider value={{ state, dispatch }}>
      {children}
    </PLContext.Provider>
  );
}

export function usePL() {
  const context = useContext(PLContext);
  if (!context) {
    throw new Error('usePL must be used within a PLProvider');
  }
  return context;
}
