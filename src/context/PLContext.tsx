'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { PLState, PLAction } from '@/types';
import { parseCSV } from '@/lib/csvParser';

const initialState: PLState = {
  transactions: [],
  accounts: new Map(),
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

    default:
      return state;
  }
}

interface PLContextValue {
  state: PLState;
  dispatch: React.Dispatch<PLAction>;
}

const PLContext = createContext<PLContextValue | null>(null);

export function PLProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plReducer, initialState);

  // Load CSV data on mount
  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const apiToken = process.env.NEXT_PUBLIC_DATA_API_TOKEN || 'dev-token';
        const headers = { 'x-api-token': apiToken };
        const response = await fetch('/api/data?file=all-txn', { headers });

        if (!response.ok) {
          throw new Error('Failed to load transaction CSV file');
        }

        const csvContent = await response.text();
        const { transactions: allTransactions, accounts, months: allMonths } = parseCSV(csvContent);

        // TTM: Dec 2024 through Nov 2025
        const ttmMonths = ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
        const transactions = allTransactions.filter(t => ttmMonths.includes(t.month));
        const months = allMonths.filter(m => ttmMonths.includes(m));

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
