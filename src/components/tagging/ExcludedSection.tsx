'use client';

import { useMemo, useState } from 'react';
import { usePL } from '@/context/PLContext';
import { formatCurrency } from '@/lib/csvParser';
import { ChevronIcon } from '@/components/ui/ChevronIcon';
import { Exclusion } from '@/types';

interface GroupedExclusions {
  [category: string]: {
    exclusions: Exclusion[];
    total: number;
    justification: string;
  };
}

export function ExcludedSection() {
  const { state } = usePL();
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const grouped = useMemo((): GroupedExclusions => {
    const result: GroupedExclusions = {};

    for (const exclusion of state.exclusions) {
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
  }, [state.exclusions]);

  const totalExcluded = useMemo(() => {
    return state.exclusions.reduce((sum, e) => sum + e.amount, 0);
  }, [state.exclusions]);

  const categories = Object.keys(grouped).sort();

  if (state.exclusions.length === 0) return null;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Category colors
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
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
      'M&A Process': 'bg-slate-500',
    };
    return colors[category] || 'bg-slate-400';
  };

  return (
    <div className="mt-10 pt-8 border-t border-slate-200">
      {/* Main Header - Collapsible */}
      <div
        className="flex items-center gap-3 mb-4 cursor-pointer group"
        onClick={() => setIsMainExpanded(!isMainExpanded)}
      >
        <ChevronIcon expanded={isMainExpanded} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        <div className="w-1.5 h-6 rounded-full bg-slate-400" />
        <h2 className="text-lg font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Exclusions</h2>
        <span className="text-sm text-slate-400">
          {state.exclusions.length} items
        </span>
        <span className="ml-auto font-mono font-semibold text-slate-500">
          {formatCurrency(totalExcluded)}
        </span>
      </div>

      {isMainExpanded && (
        <div className="space-y-2 pl-6">
          {/* Summary by category */}
          <p className="text-sm text-slate-500 mb-4">
            Non-recurring or owner-related items that would not transfer to a buyer.
          </p>

          {categories.map(category => {
            const data = grouped[category];
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                {/* Category Header */}
                <div
                  className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <ChevronIcon expanded={isExpanded} className="text-slate-400" />
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(category)}`} />
                  <span className="font-medium text-slate-800">{category}</span>
                  <span className="text-sm text-slate-400">
                    {data.exclusions.length}
                  </span>
                  <span className="ml-auto text-xs text-slate-400 max-w-sm truncate hidden md:block">
                    {data.justification}
                  </span>
                  <span className="font-mono text-sm text-slate-600 ml-4">
                    {formatCurrency(data.total)}
                  </span>
                </div>

                {/* Transactions */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {data.exclusions.map((exc, idx) => (
                      <div
                        key={`${exc.date}-${exc.amount}-${idx}`}
                        className="flex items-center gap-4 px-6 py-2 bg-white text-sm hover:bg-slate-50/50 transition-colors"
                      >
                        <span className="text-slate-400 font-mono text-xs w-20">{exc.date}</span>
                        <span className="text-slate-700 flex-1 truncate">
                          {exc.vendor || exc.memo?.substring(0, 40) || 'Unknown'}
                        </span>
                        <span className="text-slate-400 text-xs w-28 truncate hidden lg:block">
                          {exc.account.replace(/^\d{4}\s+/, '')}
                        </span>
                        <span className="font-mono text-slate-600 w-24 text-right">
                          {formatCurrency(exc.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
