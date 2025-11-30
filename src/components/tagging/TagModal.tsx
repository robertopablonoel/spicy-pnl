'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import { usePL } from '@/context/PLContext';
import { formatCurrency } from '@/lib/csvParser';

interface TagModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TagModal({ transaction, onClose }: TagModalProps) {
  const { state, dispatch } = usePL();
  const [activeTab, setActiveTab] = useState<'personal' | 'nonRecurring'>('personal');
  const [newSubAccount, setNewSubAccount] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);

  const handleTag = (subAccount: string) => {
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

  const handleAddNew = () => {
    if (newSubAccount.trim()) {
      dispatch({
        type: 'ADD_SUB_ACCOUNT',
        payload: { category: activeTab, name: newSubAccount.trim() }
      });
      handleTag(newSubAccount.trim());
    }
  };

  const subAccounts = state.tagConfig[activeTab];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Tag Transaction</h3>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {transaction.name || transaction.memo} - {formatCurrency(transaction.amount)}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }
            `}
            onClick={() => setActiveTab('personal')}
          >
            Personal
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'nonRecurring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }
            `}
            onClick={() => setActiveTab('nonRecurring')}
          >
            Non-Recurring
          </button>
        </div>

        {/* Sub-account list */}
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {subAccounts.map(subAccount => (
              <button
                key={subAccount}
                onClick={() => handleTag(subAccount)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {subAccount}
              </button>
            ))}

            {/* Add new option */}
            {!showNewInput ? (
              <button
                onClick={() => setShowNewInput(true)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add new sub-account
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubAccount}
                  onChange={e => setNewSubAccount(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddNew();
                    if (e.key === 'Escape') setShowNewInput(false);
                  }}
                />
                <button
                  onClick={handleAddNew}
                  disabled={!newSubAccount.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
