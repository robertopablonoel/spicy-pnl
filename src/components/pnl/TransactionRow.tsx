'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import { usePL } from '@/context/PLContext';
import { formatCurrency } from '@/lib/csvParser';
import { TagModal } from '@/components/tagging/TagModal';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { state, dispatch } = usePL();
  const [showTagModal, setShowTagModal] = useState(false);

  const tag = state.tags[transaction.id];
  const isTagged = !!tag;

  const handleUntag = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'UNTAG_TRANSACTION', payload: transaction.id });
  };

  const formatDate = (dateStr: string) => {
    const [month, day] = dateStr.split('/');
    return `${month}/${day}`;
  };

  return (
    <>
      <div
        className={`
          flex items-center gap-3 py-1.5 px-2 rounded text-sm
          ${isTagged ? 'bg-amber-50 opacity-60' : 'bg-white hover:bg-slate-50'}
        `}
      >
        {/* Date */}
        <span className="text-slate-400 font-mono text-xs w-12 flex-shrink-0">
          {formatDate(transaction.transactionDate)}
        </span>

        {/* Name/Vendor */}
        <span className={`font-medium w-32 flex-shrink-0 truncate ${isTagged ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {transaction.name || '-'}
        </span>

        {/* Memo */}
        <span className={`flex-1 truncate ${isTagged ? 'line-through text-slate-400' : 'text-slate-500'}`}>
          {transaction.memo || transaction.transactionType}
        </span>

        {/* Tag badge */}
        {isTagged && (
          <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
            {tag.subAccount}
          </span>
        )}

        {/* Amount */}
        <span className={`font-mono text-right w-24 flex-shrink-0
          ${isTagged ? 'line-through text-slate-400' : transaction.amount < 0 ? 'text-red-600' : 'text-slate-700'}
        `}>
          {formatCurrency(transaction.amount)}
        </span>

        {/* Tag/Untag button */}
        {isTagged ? (
          <button
            onClick={handleUntag}
            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 flex-shrink-0"
          >
            Untag
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTagModal(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 flex-shrink-0"
          >
            Tag
          </button>
        )}
      </div>

      {/* Tag Modal */}
      {showTagModal && (
        <TagModal
          transaction={transaction}
          onClose={() => setShowTagModal(false)}
        />
      )}
    </>
  );
}
