import { ChevronDown, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@utils/cn';
import type { Strategy } from '@/types';

interface StrategySelectorProps {
  strategies: Strategy[];
  selected: Strategy;
  disabled?: boolean;
  onSelect: (strategy: Strategy) => void;
}

export function StrategySelector({ strategies, selected, disabled, onSelect }: StrategySelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Selector trigger */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left',
            disabled
              ? 'bg-ink-900/40 border-ink-600/30 cursor-not-allowed opacity-60'
              : 'bg-ink-900/60 border-ink-600/60 hover:border-brand-400/50 cursor-pointer',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FlaskConical size={15} className="text-brand-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-ink-300 uppercase tracking-wide">Strategy</div>
              <div className="font-display text-sm font-semibold text-ink-50 truncate">{selected.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="px-1.5 py-0.5 rounded bg-brand-400/20 text-brand-300 text-2xs font-bold">
              {selected.shortName}
            </span>
            <ChevronDown size={14} className={cn('text-ink-300 transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="absolute top-full mt-1.5 w-full z-30 bg-ink-800 border border-ink-600 rounded-xl shadow-2xl overflow-hidden">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ink-700/60 transition-colors border-b border-ink-600/30 last:border-b-0',
                    selected.id === s.id && 'bg-brand-400/10',
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-ink-50">{s.name}</div>
                    <div className="text-2xs text-ink-300 mt-0.5">{s.timeframe} · Max {s.maxPositions} pos · {s.riskPerTrade}% risk</div>
                  </div>
                  {selected.id === s.id && (
                    <span className="h-2 w-2 rounded-full bg-brand-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Strategy info */}
      <div className="bg-ink-900/60 border border-ink-600/40 rounded-xl p-3 space-y-2">
        <p className="text-xs text-ink-200 leading-relaxed">{selected.description}</p>
        <div className="flex flex-wrap gap-1">
          {selected.indicators.map((ind) => (
            <span key={ind} className="text-2xs px-1.5 py-0.5 rounded bg-brand-400/10 text-brand-300 border border-brand-400/20">
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-1.5">
        <div className="text-2xs text-ink-300 uppercase tracking-wide px-0.5">Parameters</div>
        {selected.params.map((p) => (
          <div key={p.key} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-ink-900/40 border border-ink-600/30">
            <span className="text-xs text-ink-300">{p.label}</span>
            <span className="font-mono text-xs text-ink-50 tabular-nums">
              {p.value}{p.unit ? ` ${p.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
