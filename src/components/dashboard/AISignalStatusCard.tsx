import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { generateAISignal } from '@services/aiDecisionEngine.service';
import { useOptionChain } from '@hooks/useOptionChain';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { AISignal } from '@/types';

const REFRESH_MS = 8000;
/** Nearest expiry — same default the Option Chain page itself starts on. */
const EXPIRY_INDEX = 0;

type DisplayState = 'BUY_CE' | 'BUY_PE' | 'WAIT';

const STATE_CONFIG: Record<DisplayState, { label: string; text: string; dot: string }> = {
  BUY_CE: { label: 'BUY CE', text: 'text-loss', dot: 'bg-loss' },
  BUY_PE: { label: 'BUY PE', text: 'text-gain', dot: 'bg-gain' },
  WAIT:   { label: 'WAIT',   text: 'text-ink-200', dot: 'bg-ink-400' },
};

/**
 * Dashboard summary card for the AI Decision Engine (reused unchanged from
 * generateAISignal(), Prompt 3). This app only ever executes BUY CE / BUY
 * PE (Prompt: "designed ONLY for NIFTY Option BUYING"), so any other
 * recommendation (SELL_CE/SELL_PE, or a below-threshold signal) displays as
 * WAIT here — a display-only simplification, not a change to the
 * underlying AI logic.
 */
export function AISignalStatusCard({ delay = 0 }: { delay?: number }) {
  const { data } = useOptionChain(EXPIRY_INDEX);
  const [signal, setSignal] = useState<AISignal | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;

    const analyze = () => {
      const d = dataRef.current;
      if (!d) return;
      const atmRow = d.strikes.find((s) => s.strike === d.atmStrike) ?? d.strikes[0];
      if (!atmRow) return;
      setSignal(
        generateAISignal({
          strike: d.atmStrike,
          expiry: d.expiry.label,
          spotPrice: d.spotPrice,
          pcr: d.pcr,
          maxPain: d.maxPain,
          row: atmRow,
        }),
      );
    };

    analyze();
    const id = setInterval(analyze, REFRESH_MS);
    return () => clearInterval(id);
  }, [data]);

  const displayState: DisplayState =
    signal?.recommendation === 'BUY_CE' || signal?.recommendation === 'BUY_PE'
      ? signal.recommendation
      : 'WAIT';
  const cfg = STATE_CONFIG[displayState];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs text-ink-300 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles size={12} className="text-brand-300" />
          AI Signal Status
        </span>
        <span className={cn('h-2 w-2 rounded-full mt-1 shrink-0 animate-pulse-dot', cfg.dot)} />
      </div>

      <div className={cn('mt-2 font-display text-xl font-bold tracking-tight', cfg.text)}>
        {signal ? cfg.label : '—'}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-2xs">
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Confidence</span>
          <span className="font-mono text-ink-100 tabular-nums">{signal ? `${signal.confidence}%` : '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Strike</span>
          <span className="font-mono text-ink-100 tabular-nums">{signal ? formatIndianNumber(signal.strike, 0) : '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-300">LTP</span>
          <span className="font-mono text-ink-100 tabular-nums">{signal ? `₹${formatIndianNumber(signal.currentLTP)}` : '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Trend</span>
          <span className="font-mono text-ink-100">{signal?.trend ?? '—'}</span>
        </div>
      </div>
    </motion.div>
  );
}
