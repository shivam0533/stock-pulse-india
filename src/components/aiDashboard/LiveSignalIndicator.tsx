import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { formatIndianNumber, formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AIAction, AISignal } from '@/types';

function sideOf(action: AIAction): 'CE' | 'PE' {
  return action === 'BUY_CE' || action === 'SELL_CE' ? 'CE' : 'PE';
}

type LightState = 'BUY' | 'SELL' | 'WAIT';

const LIGHT_CONFIG: Record<LightState, { label: string; dot: string; ring: string; text: string; badge: string }> = {
  BUY:  { label: 'BUY NOW',  dot: 'bg-gain',    ring: 'bg-gain',    text: 'text-gain',    badge: 'bg-gain-subtle border-gain-border' },
  SELL: { label: 'SELL NOW', dot: 'bg-loss',    ring: 'bg-loss',    text: 'text-loss',    badge: 'bg-loss-subtle border-loss-border' },
  WAIT: { label: 'WAIT',     dot: 'bg-ink-400', ring: 'bg-ink-400', text: 'text-ink-200', badge: 'bg-ink-700 border-ink-600' },
};

function Field({ label, value, accent }: { label: string; value: string; accent?: 'gain' | 'loss' }) {
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1 leading-tight">{label}</div>
      <div
        className={cn(
          'font-mono text-sm font-semibold tabular-nums truncate',
          accent === 'gain' ? 'text-gain' : accent === 'loss' ? 'text-loss' : 'text-ink-50',
        )}
      >
        {value}
      </div>
    </div>
  );
}

interface LiveSignalIndicatorProps {
  signal: AISignal | null;
  stopLossPrice: number;
  targetPrice: number;
  lossPercent: number;
  profitPercent: number;
}

/**
 * Premium three-state "traffic light" signal indicator for the AI Dashboard.
 * Purely a display built on top of the existing generateAISignal() output
 * (Prompt 3) — no new AI logic, no execution. Stop Loss / Target shown here
 * are the existing configured Option Chain Risk Settings percentages
 * (Prompt 1), applied to the signal's entry price for illustration only.
 */
export function LiveSignalIndicator({
  signal, stopLossPrice, targetPrice, lossPercent, profitPercent,
}: LiveSignalIndicatorProps) {
  if (!signal) {
    return (
      <div className="rounded-2xl border border-ink-600/60 p-5 bg-ink-800/60 backdrop-blur-sm shadow-card animate-pulse">
        <div className="h-4 w-40 bg-ink-700 rounded mb-4" />
        <div className="h-16 w-full bg-ink-700 rounded-xl" />
      </div>
    );
  }

  const isCall = signal.recommendation === 'BUY_CE' || signal.recommendation === 'SELL_CE';
  const isWait = signal.recommendation === 'WAIT';
  const best = [...signal.scores].sort((a, b) => b.confidence - a.confidence)[0];
  const side = isWait ? sideOf(best.action) : (isCall ? 'CE' : 'PE');
  const lightState: LightState = isWait ? 'WAIT' : signal.recommendation.startsWith('BUY') ? 'BUY' : 'SELL';
  const cfg = LIGHT_CONFIG[lightState];
  const TrendIcon = signal.trend === 'Bullish' ? TrendingUp : signal.trend === 'Bearish' ? TrendingDown : Activity;

  return (
    <div className="rounded-2xl border border-ink-600/60 p-5 bg-ink-800/60 backdrop-blur-sm shadow-card relative overflow-hidden">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-semibold text-ink-50 flex items-center gap-2">
          <Activity size={16} className="text-brand-300" />
          Live Signal Indicator
        </h2>
        <span className="flex items-center gap-1.5 text-2xs text-ink-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          Live
        </span>
      </div>

      {/* Traffic light */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${lightState}-${signal.generatedAt}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn('flex items-center gap-4 px-4 py-4 rounded-2xl border mb-4', cfg.badge)}
        >
          <span className="relative flex h-4 w-4 shrink-0">
            {!isWait && (
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', cfg.ring)} />
            )}
            <span className={cn('relative inline-flex h-4 w-4 rounded-full', cfg.dot)} />
          </span>
          <div className="flex-1">
            <div className={cn('font-display text-2xl font-bold tracking-tight', cfg.text)}>
              {cfg.label}
            </div>
            <div className="text-2xs text-ink-400 mt-0.5">
              NIFTY {formatIndianNumber(signal.strike, 0)} {side} · {signal.expiry}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={cn('font-mono text-3xl font-bold tabular-nums', cfg.text)}>
              {isWait ? best.confidence : signal.confidence}%
            </div>
            <div className="text-2xs text-ink-400 uppercase tracking-wide">confidence</div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Display fields */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Field label="Confidence %" value={`${isWait ? best.confidence : signal.confidence}%`} />
        <Field label="Trend" value={signal.trend} accent={signal.trend === 'Bullish' ? 'gain' : signal.trend === 'Bearish' ? 'loss' : undefined} />
        <Field label="Signal Time" value={formatTime(signal.generatedAt)} />
        <Field label="Selected Strike" value={formatIndianNumber(signal.strike, 0)} />
        <Field label="CE / PE" value={side} accent={side === 'CE' ? 'loss' : 'gain'} />
        <Field label="Entry Price" value={`₹${formatIndianNumber(signal.currentLTP)}`} />
        <Field label={`Stop Loss (${lossPercent}%)`} value={`₹${formatIndianNumber(stopLossPrice)}`} accent="loss" />
        <Field label={`Target (${profitPercent}%)`} value={`₹${formatIndianNumber(targetPrice)}`} accent="gain" />
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-2xs text-ink-400">
        <TrendIcon size={11} />
        {signal.momentum} momentum · {signal.reason}
      </div>
    </div>
  );
}
