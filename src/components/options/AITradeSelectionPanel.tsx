import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target } from 'lucide-react';
import { selectBestTrade } from '@services/aiDecisionEngine.service';
import { AI_TRADE_SELECTION_SETTINGS } from '@store/aiTradeSelection.store';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { AITradeSelectionResult, OptionChainData } from '@/types';

const ANALYSIS_INTERVAL_MS = 8000;
const { minLTP, maxLTP } = AI_TRADE_SELECTION_SETTINGS;

/**
 * AI Trade Selection Logic — a second, additive capability of the Option
 * Chain AI Decision Engine. Unlike AIDecisionEngineCard (which analyzes only
 * the ATM strike), this scans every strike's CE and PE contract, ignores
 * anything outside the fixed Min/Max LTP range, and auto-selects the
 * single best Strike + CE/PE + BUY/SELL combination once its confidence
 * clears the configured threshold — otherwise WAIT. Selection only: no
 * order is ever placed.
 */
export function AITradeSelectionPanel({ data }: { data: OptionChainData | undefined }) {
  const [result, setResult] = useState<AITradeSelectionResult | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;

    const analyze = () => {
      const d = dataRef.current;
      if (!d) return;
      setResult(
        selectBestTrade(
          { strikes: d.strikes, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain },
          { minLTP, maxLTP },
          useAutoTradingStore.getState().minConfidence,
        ),
      );
    };

    analyze();
    const id = setInterval(analyze, ANALYSIS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data]);

  return (
    <div className="rounded-2xl border border-ink-600/60 p-4 bg-ink-800/60 backdrop-blur-sm shadow-card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">AI Trade Selection</h3>
      </div>
      <p className="text-2xs text-ink-400 mb-3">
        Auto-selects the best contract from strikes with LTP between ₹{minLTP} and ₹{maxLTP}.
      </p>

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
