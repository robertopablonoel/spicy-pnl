'use client';

import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/csvParser';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const formatDate = (dateStr: string) => {
    const [month, day] = dateStr.split('/');
    return `${month}/${day}`;
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded text-sm bg-white hover:bg-slate-50">
      {/* Date */}
      <span className="text-slate-400 font-mono text-xs w-12 flex-shrink-0">
        {formatDate(transaction.transactionDate)}
      </span>

      {/* Name/Vendor */}
      <span className="font-medium w-32 flex-shrink-0 truncate text-slate-700">
        {transaction.name || '-'}
      </span>

      {/* Memo */}
      <span className="flex-1 truncate text-slate-500">
        {transaction.memo || transaction.transactionType}
      </span>

      {/* Amount */}
      <span className={`font-mono text-right w-24 flex-shrink-0 ${transaction.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}
