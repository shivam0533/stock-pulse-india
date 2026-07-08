import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, BrainCircuit, Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import { generateAISignal, actionLabel } from '@services/aiDecisionEngine.service';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { AIAction, AIRecommendation, AISignal, OptionChainData } from '@/types';

const ANALYSIS_INTERVAL_MS = 8000;

const RECOMMENDATION_STYLES: Record<AIRecommendation, { label: string; badge: string; text: string }> = {
  BUY_CE:  { label: 'BUY CE',  badge: 'bg-gain-subtle border-gain-border',           text: 'text-gain'      },
  BUY_PE:  { label: 'BUY PE',  badge: 'bg-loss-subtle border-loss-border',           text: 'text-loss'      },
  SELL_CE: { label: 'SELL CE', badge: 'bg-brand-400/15 border-brand-400/30',         text: 'text-brand-300' },
  SELL_PE: { label: 'SELL PE', badge: 'bg-brand-400/15 border-brand-400/30',         text: 'text-brand-300' },
  WAIT:    { label: 'WAIT',    badge: 'bg-ink-700 border-ink-600',                   text: 'text-ink-200'   },
};

const SCORE_BAR_COLOR: Record<AIAction, string> = {
  BUY_CE: 'bg-gain',
  BUY_PE: 'bg-loss',
  SELL_CE: 'bg-brand-400',
  SELL_PE: 'bg-brand-400',
};

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-0.5 truncate">{label}</div>
      <div className="font-mono text-sm font-semibold text-ink-50 tabular-nums truncate">{value}</div>
    </div>
  );
}

/**
 * Premium "AI Decision Engine" signal card — Option Chain module only.
 * Continuously (re-)analyzes the ATM strike using mock indicators (OI/volume/
 * PCR/IV/Greeks/VWAP/EMA/RSI/MACD/SuperTrend/price action/support-resistance/
 * OI build-up/trend/momentum) and surfaces a BUY CE / BUY PE / SELL CE /
 * SELL PE / WAIT recommendation with a confidence score. Purely illustrative
 * — mock data only, never places or influences any real or paper order.
 */
export function AIDecisionEngineCard({ data }: { data: OptionChainData | undefined }) {
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
        <div className="h-10 w-full bg-ink-700 rounded-xl" />
      </div>
    );
  }

  const style = RECOMMENDATION_STYLES[signal.recommendation];
  const isWait = signal.recommendation === 'WAIT';
  const TrendIcon = signal.trend === 'Bullish' ? TrendingUp : signal.trend === 'Bearish' ? TrendingDown : Activity;

  return (
    <div className="rounded-2xl border border-ink-600/60 p-4 bg-ink-800/60 backdrop-blur-sm shadow-card relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-brand-300" />
          <h3 className="font-display text-sm font-semibold text-ink-50">AI Decision Engine</h3>
        </div>
        <span className="flex items-center gap-1.5 text-2xs text-ink-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          Live
        </span>
      </div>
      <p className="text-2xs text-ink-400 mb-3">
        Continuous multi-indicator analysis · ATM {formatIndianNumber(signal.strike, 0)} strike
      </p>

      {/* Recommendation + confidence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${signal.recommendation}-${signal.generatedAt}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn('flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border mb-3', style.badge)}
        >
          <div>
            <div className={cn('font-display text-xl font-bold tracking-tight', style.text)}>
              {style.label}
            </div>
            {isWait && (
              <div className="text-2xs text-ink-400 mt-0.5">Confidence below 80% — no trade recommended</div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className={cn('font-mono text-2xl font-bold tabular-nums', style.text)}>
              {signal.confidence}%
            </div>
            <div className="text-2xs text-ink-400 uppercase tracking-wide flex items-center gap-1 justify-end">
              <Gauge size={10} /> confidence
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MiniMetric label="Strike" value={formatIndianNumber(signal.strike, 0)} />
        <MiniMetric label="Expiry" value={signal.expiry} />
        <MiniMetric label="Current LTP" value={`₹${formatIndianNumber(signal.currentLTP)}`} />
        <MiniMetric label="Trend" value={signal.trend} />
        <MiniMetric label="Momentum" value={signal.momentum} />
        <div className="bg-ink-700/40 rounded-xl px-3 py-2 border border-ink-600/40 flex items-center gap-1.5">
          <TrendIcon size={14} className={signal.trend === 'Bullish' ? 'text-gain' : signal.trend === 'Bearish' ? 'text-loss' : 'text-ink-300'} />
          <span className="text-2xs text-ink-300">{signal.trend} · {signal.momentum.toLowerCase()}</span>
        </div>
      </div>

      {/* Reason */}
      <p className="text-2xs text-ink-300 leading-relaxed mb-3 pb-3 border-b border-ink-600/30">
        {signal.reason}
      </p>

      {/* Action score breakdown */}
      <div className="space-y-1.5">
        {signal.scores.map((s) => (
          <div key={s.action} className="flex items-center gap-2">
            <span
              className={cn(
                'w-16 shrink-0 text-2xs font-semibold',
                s.action === signal.recommendation ? 'text-ink-50' : 'text-ink-400',
              )}
            >
              {actionLabel(s.action)}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', SCORE_BAR_COLOR[s.action])}
                animate={{ width: `${s.confidence}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-2xs text-ink-200 tabular-nums">
              {s.confidence}%
            </span>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <p className="text-2xs text-ink-400 mt-3 pt-3 border-t border-ink-600/30">
        Mock analysis for illustration only — not investment advice. Auto Trading is not enabled.
      </p>
    </div>
  );
}
