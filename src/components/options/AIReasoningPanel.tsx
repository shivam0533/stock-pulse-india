import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { generateAISignal } from '@services/aiDecisionEngine.service';
import { buildReasoningSummary } from '@services/aiReasoning.service';
import { formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AISignal, OptionChainData } from '@/types';

const ANALYSIS_INTERVAL_MS = 8000;

const STRENGTH_COLOR: Record<'Strong' | 'Moderate' | 'Weak', string> = {
  Strong: 'text-gain',
  Moderate: 'text-brand-300',
  Weak: 'text-ink-300',
};

function ReasonMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-0.5 truncate">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums truncate', accent ?? 'text-ink-50')}>
        {value}
      </div>
    </div>
  );
}

/**
 * "AI Reasoning Panel" — Option Chain / AI Signals tab only.
 *
 * Explains WHY the AI Decision Engine favours its current pick by surfacing
 * the underlying indicator snapshot as a plain-English factor list, plus a
 * few summary metrics (Confidence, Market Strength, Momentum, Probability,
 * Signal Time). It independently re-runs the existing, unmodified
 * generateAISignal() on the ATM strike on the same cadence as the AI
 * Decision Engine card — it never computes its own confidence/trend/momentum
 * and never selects or places a trade. Trade selection stays with the AI
 * Decision Engine / AI Trade Selection Logic; execution, Stop Loss (3%) and
 * Target (7%) stay entirely with the existing Active Trade / Risk Settings
 * logic. Purely illustrative — mock data only.
 */
export function AIReasoningPanel({ data }: { data: OptionChainData | undefined }) {
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
    const id = setInterval(analyze, ANALYSIS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data]);

  if (!signal) {
    return (
      <div className="rounded-2xl border border-ink-600/60 p-5 bg-ink-800/60 backdrop-blur-sm shadow-card animate-pulse">
        <div className="h-4 w-40 bg-ink-700 rounded mb-4" />
        <div className="h-24 w-full bg-ink-700 rounded-xl" />
      </div>
    );
  }

  const summary = buildReasoningSummary(signal);

  return (
    <div className="rounded-2xl border border-ink-600/60 p-4 bg-ink-800/60 backdrop-blur-sm shadow-card relative overflow-hidden">
      <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-brand-300" />
          <h3 className="font-display text-sm font-semibold text-ink-50">AI Reasoning</h3>
        </div>
        <span className="text-2xs text-ink-400">Why this pick</span>
      </div>
      <p className="text-2xs text-ink-400 mb-3">
        Signals behind the current ATM {signal.strike} analysis — decision only, no execution.
      </p>

      {/* Factor list */}
      <AnimatePresence mode="wait">
        <motion.ul
          key={signal.generatedAt}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3 pb-3 border-b border-ink-600/30"
        >
          {summary.factors.map((factor) => (
            <li key={factor} className="flex items-center gap-1.5 text-2xs text-ink-200">
              <CheckCircle2 size={12} className="text-brand-300 shrink-0" />
              <span className="truncate">{factor}</span>
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ReasonMetric label="Confidence" value={`${summary.confidence}%`} />
        <ReasonMetric
          label="Market Strength"
          value={`${summary.marketStrength} (${summary.marketStrengthScore})`}
          accent={STRENGTH_COLOR[summary.marketStrength]}
        />
        <ReasonMetric label="Momentum" value={summary.momentum} />
        <ReasonMetric label="Probability" value={`${summary.probability}%`} />
        <ReasonMetric label="Signal Time" value={formatTime(summary.signalTime)} />
      </div>
    </div>
  );
}
