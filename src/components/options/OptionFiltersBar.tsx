import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@utils/cn';
import type { OptionChainFilter, OptionExpiry, OptionSortKey, StrikesAround } from '@/types';

const STRIKES_OPTIONS: { label: string; value: StrikesAround }[] = [
  { label: '±5 Strikes', value: 10 },
  { label: '±10 Strikes', value: 20 },
  { label: '±15 Strikes', value: 30 },
  { label: 'All', value: 'all' },
];

const SORT_OPTIONS: { label: string; value: OptionSortKey }[] = [
  { label: 'Strike', value: 'strike' },
  { label: 'Call OI', value: 'callOI' },
  { label: 'Put OI', value: 'putOI' },
  { label: 'Call Vol', value: 'callVolume' },
  { label: 'Put Vol', value: 'putVolume' },
];

interface OptionFiltersBarProps {
  expiries: OptionExpiry[];
  filters: OptionChainFilter;
  onChange: (patch: Partial<OptionChainFilter>) => void;
  refreshCountdown: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export function OptionFiltersBar({
  expiries,
  filters,
  onChange,
  refreshCountdown,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing,
}: OptionFiltersBarProps) {
  return (
    <div className="space-y-3">
      {/* Row 1 — Expiry tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {expiries.map((exp, i) => (
          <button
            key={exp.label}
            type="button"
            onClick={() => onChange({ expiryIndex: i })}
            className={cn(
              'shrink-0 flex flex-col items-center px-4 py-2 rounded-xl text-xs font-medium border transition-all',
              filters.expiryIndex === i
                ? 'bg-brand-400/15 text-brand-300 border-brand-400/40 shadow-glow-amber'
                : 'bg-ink-800/60 text-ink-200 border-ink-600/60 hover:border-ink-500 hover:text-ink-50',
            )}
          >
            <span className="font-semibold">{exp.label}</span>
            <span className={cn('text-2xs mt-0.5', filters.expiryIndex === i ? 'text-brand-400' : 'text-ink-300')}>
              {exp.dte}D · {exp.type === 'weekly' ? 'W' : 'M'}
            </span>
          </button>
        ))}
      </div>

      {/* Row 2 — Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex items-center bg-ink-800 border border-ink-600 rounded-xl focus-within:border-brand-400/60 transition-colors">
          <Search size={14} className="ml-3 text-ink-300 shrink-0" />
          <input
            type="number"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Strike…"
            className="w-28 bg-transparent h-9 px-2 text-sm text-ink-50 placeholder:text-ink-300 outline-none tabular-nums"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Strikes around */}
        <div className="flex items-center gap-1 bg-ink-800 border border-ink-600 rounded-xl px-1 py-1">
          <SlidersHorizontal size={13} className="ml-1 text-ink-300" />
          {STRIKES_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange({ strikesAround: opt.value })}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                filters.strikesAround === opt.value
                  ? 'bg-brand-400/20 text-brand-300'
                  : 'text-ink-200 hover:text-ink-50',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-2xs text-ink-300 uppercase tracking-wide hidden sm:block">Sort</span>
          <select
            value={filters.sortKey}
            onChange={(e) => onChange({ sortKey: e.target.value as OptionSortKey })}
            className="bg-ink-800 border border-ink-600 rounded-xl text-xs text-ink-100 px-2.5 py-2 outline-none hover:border-ink-500 transition-colors"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
            className="px-2.5 py-1.5 bg-ink-800 border border-ink-600 rounded-xl text-xs text-ink-200 hover:text-ink-50 hover:border-ink-500 transition-colors"
          >
            {filters.sortDir === 'asc' ? '↑ ASC' : '↓ DESC'}
          </button>
        </div>

        {/* Auto Refresh */}
        <div className="flex items-center gap-2 border-l border-ink-600/60 pl-2">
          <button
            type="button"
            onClick={onManualRefresh}
            className={cn(
              'p-2 rounded-lg text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors',
              isRefreshing && 'animate-spin text-brand-300',
            )}
            aria-label="Refresh now"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
              autoRefresh
                ? 'bg-gain-subtle text-gain border-gain-border'
                : 'bg-ink-800 text-ink-300 border-ink-600 hover:border-ink-500',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', autoRefresh ? 'bg-gain animate-pulse' : 'bg-ink-400')} />
            {autoRefresh ? `${refreshCountdown}s` : 'Auto Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
