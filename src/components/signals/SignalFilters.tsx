import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@utils/cn';
import type { DetailedSignal, SignalFilterState } from '@/types';

type Patch = Partial<SignalFilterState>;

interface SignalFiltersProps {
  filters: SignalFilterState;
  onChange: (patch: Patch) => void;
  signals: DetailedSignal[];
}

const ACTION_TABS = ['ALL', 'BUY', 'SELL', 'HOLD'] as const;
const RISK_OPTS = ['ALL', 'Low', 'Medium', 'High'] as const;
const STRENGTH_OPTS = ['ALL', 'Strong', 'Moderate', 'Weak'] as const;
const SORT_OPTS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Confidence', value: 'confidence' },
  { label: 'Risk/Reward', value: 'riskReward' },
] as const;

const ACTION_COLORS = {
  ALL: 'bg-ink-700 text-ink-50 border-ink-500',
  BUY: 'bg-gain-subtle text-gain border-gain-border',
  SELL: 'bg-loss-subtle text-loss border-loss-border',
  HOLD: 'bg-brand-400/15 text-brand-300 border-brand-400/30',
};

export function SignalFilters({ filters, onChange, signals }: SignalFiltersProps) {
  const counts = {
    ALL: signals.length,
    BUY: signals.filter((s) => s.action === 'BUY').length,
    SELL: signals.filter((s) => s.action === 'SELL').length,
    HOLD: signals.filter((s) => s.action === 'HOLD').length,
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex items-center bg-ink-800 border border-ink-600 rounded-xl focus-within:border-brand-400/60 transition-colors flex-1 min-w-[200px]">
          <Search size={15} className="ml-3.5 text-ink-300 shrink-0" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search symbol or name…"
            className="flex-1 bg-transparent h-10 px-3 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
          />
          {filters.search && (
            <button type="button" onClick={() => onChange({ search: '' })} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-ink-300" />
          <span className="text-2xs text-ink-300 uppercase tracking-wide hidden sm:block">Sort</span>
          <div className="flex bg-ink-800 border border-ink-600 rounded-xl p-0.5">
            {SORT_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ sortBy: opt.value })}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                  filters.sortBy === opt.value
                    ? 'bg-brand-400/20 text-brand-300'
                    : 'text-ink-300 hover:text-ink-100',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Action tabs + Risk + Strength */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Action tabs */}
        <div className="flex gap-1.5">
          {ACTION_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChange({ action: tab })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                filters.action === tab
                  ? ACTION_COLORS[tab]
                  : 'bg-ink-800 text-ink-300 border-ink-600 hover:text-ink-100 hover:border-ink-500',
              )}
            >
              {tab}
              <span className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                filters.action === tab ? 'bg-ink-900/30' : 'bg-ink-700 text-ink-300',
              )}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-ink-600 hidden sm:block" />

        {/* Risk */}
        <select
          value={filters.risk}
          onChange={(e) => onChange({ risk: e.target.value as SignalFilterState['risk'] })}
          className="bg-ink-800 border border-ink-600 rounded-xl text-xs text-ink-100 px-2.5 py-2 outline-none hover:border-ink-500 transition-colors"
        >
          {RISK_OPTS.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All Risks' : `${r} Risk`}</option>)}
        </select>

        {/* Strength */}
        <select
          value={filters.strength}
          onChange={(e) => onChange({ strength: e.target.value as SignalFilterState['strength'] })}
          className="bg-ink-800 border border-ink-600 rounded-xl text-xs text-ink-100 px-2.5 py-2 outline-none hover:border-ink-500 transition-colors"
        >
          {STRENGTH_OPTS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Strengths' : `${s} Signal`}</option>)}
        </select>

        {/* Active filter count badge */}
        {(filters.action !== 'ALL' || filters.risk !== 'ALL' || filters.strength !== 'ALL' || filters.search) && (
          <button
            type="button"
            onClick={() => onChange({ action: 'ALL', risk: 'ALL', strength: 'ALL', search: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-loss border border-loss-border bg-loss-subtle hover:bg-loss/20 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
