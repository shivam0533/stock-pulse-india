import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Target } from 'lucide-react';
import { selectBestTrade } from '@services/aiDecisionEngine.service';
import {
  useAITradeSelectionStore,
  DEFAULT_AI_TRADE_SELECTION_SETTINGS,
  type AITradeSelectionSettings,
} from '@store/aiTradeSelection.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { AITradeSelectionResult, OptionChainData } from '@/types';

const ANALYSIS_INTERVAL_MS = 8000;

function LTPInput({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-xs text-ink-200 mb-1">{label}</div>
      <div className="flex items-center gap-1.5 bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 focus-within:border-brand-400/60 transition-colors">
        <span className="text-xs text-ink-400 shrink-0">₹</span>
        <input
          type="number"
          value={value}
          min={0}
          step={1}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v >= 0) onChange(v);
          }}
          className="w-full bg-transparent font-mono text-sm text-ink-50 tabular-nums outline-none"
        />
      </div>
    </div>
  );
}

/**
 * AI Trade Selection Logic — a second, additive capability of the Option
 * Chain AI Decision Engine. Unlike AIDecisionEngineCard (which analyzes only
 * the ATM strike), this scans every strike's CE and PE contract, ignores
 * anything outside the editable Min/Max LTP range, and auto-selects the
 * single best Strike + CE/PE + BUY/SELL combination once its confidence
 * clears 80% — otherwise WAIT. Selection only: no order is ever placed.
 */
export function AITradeSelectionPanel({ data }: { data: OptionChainData | undefined }) {
  const { minLTP, maxLTP, applySettings, resetToDefault } = useAITradeSelectionStore();
  const [draft, setDraft] = useState<AITradeSelectionSettings>({ minLTP, maxLTP });
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<AITradeSelectionResult | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;

  const hasChanges = draft.minLTP !== minLTP || draft.maxLTP !== maxLTP;

  const handleApply = () => {
    applySettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    resetToDefault();
    setDraft(DEFAULT_AI_TRADE_SELECTION_SETTINGS);
  };

  useEffect(() => {
    if (!data) return;

    const analyze = () => {
      const d = dataRef.current;
      if (!d) return;
      setResult(
        selectBestTrade(
          { strikes: d.strikes, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain },
          { minLTP, maxLTP },
        ),
      );
    };

    analyze();
    const id = setInterval(analyze, ANALYSIS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data, minLTP, maxLTP]);

  return (
    <div className="rounded-2xl border border-ink-600/60 p-4 bg-ink-800/60 backdrop-blur-sm shadow-card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">AI Trade Selection</h3>
      </div>
      <p className="text-2xs text-ink-400 mb-3">
        Auto-selects the best contract from strikes within your LTP range.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <LTPInput label="Minimum LTP" value={draft.minLTP} onChange={(v) => setDraft((d) => ({ ...d, minLTP: v }))} />
        <LTPInput label="Maximum LTP" value={draft.maxLTP} onChange={(v) => setDraft((d) => ({ ...d, maxLTP: v }))} />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasChanges}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            hasChanges
              ? 'bg-brand-400 text-ink-950 hover:bg-brand-300'
              : 'bg-ink-700/60 text-ink-400 cursor-not-allowed',
          )}
        >
          {saved && <Check size={13} />}
          {saved ? 'Settings Applied' : 'Apply Settings'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-ink-200 border border-ink-600 hover:border-ink-400 hover:text-ink-50 bg-ink-700/60 transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={`${result.recommendation}-${result.generatedAt}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'rounded-xl border p-3',
              result.recommendation === 'SELECT'
                ? result.best?.action === 'BUY'
                  ? 'bg-gain-subtle border-gain-border'
                  : 'bg-brand-400/10 border-brand-400/30'
                : 'bg-ink-700 border-ink-600',
            )}
          >
            {result.recommendation === 'SELECT' && result.best ? (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      'font-display text-base font-bold',
                      result.best.action === 'BUY' ? 'text-gain' : 'text-brand-300',
                    )}
                  >
                    {result.best.action} {result.best.side}
                  </span>
                  <span className="font-mono text-lg font-bold text-ink-50 tabular-nums">
                    {result.best.confidence}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-200">
                  <span>Strike <span className="font-mono text-ink-50">{formatIndianNumber(result.best.strike, 0)}</span></span>
                  <span>LTP <span className="font-mono text-ink-50">₹{formatIndianNumber(result.best.ltp)}</span></span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-ink-200">WAIT</span>
                <span className="font-mono text-lg font-bold text-ink-300 tabular-nums">
                  {result?.best?.confidence ?? 0}%
                </span>
              </div>
            )}
            <p className="text-2xs text-ink-400 mt-2">{result.reason}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-2xs text-ink-400 mt-3 pt-3 border-t border-ink-600/30">
        Selection only — no order is placed. No broker execution.
      </p>
    </div>
  );
}
