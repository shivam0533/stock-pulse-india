import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@components/ui';
import { ConfidenceMeter } from './ConfidenceMeter';
import { IndicatorPills } from './IndicatorPills';
import { RiskRewardBar } from './RiskRewardBar';
import { formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { DetailedSignal } from '@/types';

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  BUY: {
    badge: 'gain' as const,
    border: 'border-l-4 border-l-gain',
    glow: 'before:bg-gain/10',
    text: 'text-gain',
  },
  SELL: {
    badge: 'loss' as const,
    border: 'border-l-4 border-l-loss',
    glow: 'before:bg-loss/10',
    text: 'text-loss',
  },
  HOLD: {
    badge: 'amber' as const,
    border: 'border-l-4 border-l-brand-400',
    glow: 'before:bg-brand-400/10',
    text: 'text-brand-300',
  },
};

const RISK_BADGE = {
  Low: 'gain',
  Medium: 'amber',
  High: 'loss',
} as const;

const STRENGTH_COLORS = {
  Strong: 'text-gain',
  Moderate: 'text-brand-300',
  Weak: 'text-ink-300',
};

interface SignalCardProps {
  signal: DetailedSignal;
  index: number;
}

export function SignalCard({ signal, index }: SignalCardProps) {
  const cfg = ACTION_CONFIG[signal.action];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-ink-800/60 backdrop-blur-sm border border-ink-600/60',
        'shadow-card flex flex-col',
        cfg.border,
        // Radial glow in corner
        'before:absolute before:top-0 before:right-0 before:h-40 before:w-40 before:rounded-full before:blur-3xl before:pointer-events-none',
        cfg.glow,
      )}
    >
      {/* New pulse badge */}
      {signal.isNew && (
        <span className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gain-subtle border border-gain-border text-2xs text-gain font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
          NEW
        </span>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={cfg.badge} className="text-xs font-bold px-2.5 py-1 uppercase">
              {signal.action}
            </Badge>
            <span className={cn('text-2xs font-semibold uppercase tracking-wide', STRENGTH_COLORS[signal.strength])}>
              {signal.strength}
            </span>
          </div>
          <div className="mt-1.5 font-display text-lg font-bold text-ink-50 leading-tight">
            {signal.symbol}
          </div>
          <div className="text-xs text-ink-300 truncate max-w-[180px]">{signal.name}</div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-2xs px-1.5 py-0.5 rounded bg-ink-700 text-ink-200 uppercase tracking-wide">
              {signal.sector}
            </span>
            <span className="text-2xs px-1.5 py-0.5 rounded bg-ink-700 text-ink-200 uppercase tracking-wide">
              NSE
            </span>
          </div>
        </div>
        <ConfidenceMeter score={signal.confidence} size={72} />
      </div>

      <div className="border-t border-ink-600/40 mx-4" />

      {/* ── Price levels ────────────────────────────────────────── */}
      <div className="p-4 pt-3">
        <RiskRewardBar
          entry={signal.entry}
          target={signal.target}
          stopLoss={signal.stopLoss}
          riskReward={signal.riskReward}
          action={signal.action}
        />
      </div>

      <div className="border-t border-ink-600/40 mx-4" />

      {/* ── AI Reason ────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={12} className="text-brand-300" />
          <span className="text-2xs text-brand-300 font-medium uppercase tracking-wide">AI Analysis</span>
        </div>
        <p className="text-xs text-ink-200 leading-relaxed line-clamp-3">{signal.reason}</p>
      </div>

      <div className="border-t border-ink-600/40 mx-4" />

      {/* ── Indicators ──────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="text-2xs text-ink-300 uppercase tracking-wide mb-2">Indicator Status</div>
        <IndicatorPills indicators={signal.indicators} />
      </div>

      <div className="border-t border-ink-600/40 mx-4" />

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 mt-auto">
        <div className="flex items-center gap-2">
          <Badge variant={RISK_BADGE[signal.riskLevel]}>
            {signal.riskLevel} Risk
          </Badge>
          <span className="flex items-center gap-1 text-2xs text-ink-300">
            <Clock size={10} />
            {formatRelativeTime(signal.generatedAt)}
          </span>
        </div>
        <Link
          to={`/stock/${signal.symbol}`}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
            signal.action === 'BUY'
              ? 'bg-gain-subtle border-gain-border text-gain hover:bg-gain/20'
              : signal.action === 'SELL'
                ? 'bg-loss-subtle border-loss-border text-loss hover:bg-loss/20'
                : 'bg-brand-400/10 border-brand-400/30 text-brand-300 hover:bg-brand-400/20',
          )}
        >
          View <ExternalLink size={11} />
        </Link>
      </div>
    </motion.div>
  );
}
