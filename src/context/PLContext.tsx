'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { PLState, PLAction, TransactionTag, TagConfig } from '@/types';
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
  loading: true,
  error: null
};

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

        const response = await fetch('/all-txn.csv');
        if (!response.ok) {
          throw new Error('Failed to load CSV file');
        }

        const csvContent = await response.text();
        const { transactions, accounts, months } = parseCSV(csvContent);

        dispatch({
          type: 'LOAD_DATA',
          payload: { transactions, accounts, months }
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
