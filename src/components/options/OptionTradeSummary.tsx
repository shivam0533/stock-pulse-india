import { motion } from 'framer-motion';
import { BarChart3, RotateCcw } from 'lucide-react';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { computeOptionTradeSummary } from '@services/optionTradeStats.service';
import { useCountUp } from '@hooks/useCountUp';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { CompletedOptionTrade } from '@/types';

type Accent = 'gain' | 'loss' | 'neutral';

function accentOf(n: number): Accent {
  return n > 0 ? 'gain' : n < 0 ? 'loss' : 'neutral';
}

const ACCENT_TEXT: Record<Accent, string> = {
  gain: 'text-gain',
  loss: 'text-loss',
  neutral: 'text-yellow-400',
};

function rupee(n: number): string {
  return `${n < 0 ? '−' : ''}₹${formatIndianNumber(Math.abs(n), 0)}`;
}

// ── Animated numeric display ─────────────────────────────────────────────────
function AnimatedValue({
  value, formatter, className,
}: { value: number; formatter: (n: number) => string; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatter(animated)}</span>;
}

// ── Small stat tile ───────────────────────────────────────────────────────────
function StatTile({
  label, value, formatter = (n) => formatIndianNumber(n, 0), accent,
}: { label: string; value: number; formatter?: (n: number) => string; accent?: Accent }) {
  const textClass = accent ? ACCENT_TEXT[accent] : 'text-ink-50';
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1 whitespace-nowrap">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums truncate', textClass)}>
        <AnimatedValue value={value} formatter={formatter} />
      </div>
    </div>
  );
}

function TradeTile({ label, trade }: { label: string; trade: CompletedOptionTrade | null }) {
  const accent = trade ? accentOf(trade.pnlAmount) : 'neutral';
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1 whitespace-nowrap">{label}</div>
      {trade ? (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-ink-200 truncate">
            {formatIndianNumber(trade.strike, 0)} {trade.side}
          </span>
          <span className={cn('font-mono text-sm font-semibold tabular-nums shrink-0', ACCENT_TEXT[accent])}>
            {rupee(trade.pnlAmount)}
          </span>
        </div>
      ) : (
        <div className="font-mono text-sm text-ink-400">—</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function OptionTradeSummary() {
  const { history, statsResetAt, resetStats } = useOptionTradeStore();
  const summary = computeOptionTradeSummary(history, statsResetAt);

  const netAccent = accentOf(summary.netPnlAmount);
  const todayAccent = accentOf(summary.todayPnlAmount);
  const emoji = summary.totalTrades === 0 ? '🟡' : netAccent === 'gain' ? '🟢' : netAccent === 'loss' ? '🔴' : '🟡';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-300" />
          <h3 className="font-display text-sm font-semibold text-ink-50">Overall Trading Summary</h3>
        </div>
        <button
          type="button"
          onClick={resetStats}
          title="Reset summary statistics only — Trade History is kept"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-medium text-ink-200 border border-ink-600 hover:border-ink-400 hover:text-ink-50 bg-ink-700/60 transition-colors"
        >
          <RotateCcw size={11} />
          Reset Statistics
        </button>
      </div>

      {summary.totalTrades === 0 ? (
        <p className="text-xs text-ink-300 text-center py-6">
          No completed trades yet. Your trading summary will appear here.
        </p>
      ) : (
        <>
          {/* Net P&L hero */}
          <div className="text-center mb-4 py-3 rounded-xl bg-ink-900/40 border border-ink-600/30">
            <div className="text-2xs text-ink-400 uppercase tracking-wide mb-1">Net Profit / Loss</div>
            <div className={cn('font-display text-2xl font-bold tabular-nums', ACCENT_TEXT[netAccent])}>
              {emoji}{' '}
              <AnimatedValue value={summary.netPnlAmount} formatter={rupee} />
              {'  '}
              <span className="text-base">
                (<AnimatedValue
                  value={summary.netPnlPercent}
                  formatter={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`}
                />)
              </span>
            </div>
          </div>

          {/* Today vs Lifetime */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40">
              <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">Today's P&L</div>
              <div className={cn('font-mono text-sm font-semibold tabular-nums', ACCENT_TEXT[todayAccent])}>
                <AnimatedValue value={summary.todayPnlAmount} formatter={rupee} />
              </div>
            </div>
            <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40">
              <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">Lifetime P&L</div>
              <div className={cn('font-mono text-sm font-semibold tabular-nums', ACCENT_TEXT[netAccent])}>
                <AnimatedValue value={summary.netPnlAmount} formatter={rupee} />
              </div>
            </div>
          </div>

          {/* Profit vs Loss bar */}
          <div className="mb-4">
            <div className="relative h-2.5 rounded-full bg-ink-700 overflow-hidden flex">
              <motion.div
                className="h-full bg-gain/70"
                initial={{ width: 0 }}
                animate={{ width: `${summary.winRatePercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <motion.div
                className="h-full bg-loss/70"
                initial={{ width: 0 }}
                animate={{ width: `${summary.lossRatePercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-2xs mt-1.5">
              <span className="text-gain font-medium">Profit {summary.winRatePercent.toFixed(0)}%</span>
              <span className="text-loss font-medium">Loss {summary.lossRatePercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Small stat tiles */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <StatTile label="Total Trades" value={summary.totalTrades} />
            <StatTile label="Win Rate" value={summary.winRatePercent} formatter={(n) => `${n.toFixed(1)}%`} accent="gain" />
            <StatTile label="Winning Trades" value={summary.winningTrades} accent="gain" />
            <StatTile label="Losing Trades" value={summary.losingTrades} accent="loss" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <StatTile label="Total Investment" value={summary.totalInvestment} formatter={rupee} />
            <StatTile label="Gross Profit" value={summary.grossProfit} formatter={rupee} accent="gain" />
            <StatTile label="Gross Loss" value={summary.grossLoss} formatter={rupee} accent="loss" />
            <StatTile label="Avg Profit / Win" value={summary.avgProfitPerWin} formatter={rupee} accent="gain" />
            <StatTile label="Avg Loss / Loss" value={summary.avgLossPerLoss} formatter={rupee} accent="loss" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TradeTile label="Best Trade" trade={summary.bestTrade} />
            <TradeTile label="Worst Trade" trade={summary.worstTrade} />
          </div>
        </>
      )}
    </motion.div>
  );
}
