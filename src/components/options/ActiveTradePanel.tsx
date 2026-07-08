import { type ElementType, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Gauge,
  LogOut,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  Target,
  TrendingDown,
  X,
} from 'lucide-react';
import { generateAISignal } from '@services/aiDecisionEngine.service';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { OptionChainData, OptionSide } from '@/types';

function formatPct(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const CONFIDENCE_REFRESH_MS = 8000;

// ── Sub-components ───────────────────────────────────────────────────────────
interface MetricProps {
  label: string;
  value: string;
  accent?: 'gain' | 'loss' | 'brand' | 'neutral';
  icon?: ElementType;
  /** Tints the whole tile's background/border to match the accent, instead of just the value text. Used for Live P&L per Prompt 5. */
  tint?: boolean;
}

function Metric({ label, value, accent = 'neutral', icon: Icon, tint }: MetricProps) {
  const textClass = {
    gain:    'text-gain',
    loss:    'text-loss',
    brand:   'text-brand-300',
    neutral: 'text-ink-50',
  }[accent];

  const tileClass =
    tint && accent === 'gain' ? 'bg-gain-subtle border-gain-border'
    : tint && accent === 'loss' ? 'bg-loss-subtle border-loss-border'
    : 'bg-ink-700/40 border-ink-600/40';

  return (
    <div className={cn('rounded-xl px-3 py-2.5 border min-w-0', tileClass)}>
      <div className="flex items-center gap-1 text-2xs text-ink-300 uppercase tracking-wide mb-1 whitespace-nowrap">
        {Icon && <Icon size={10} />}
        {label}
      </div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums truncate', textClass)}>
        {value}
      </div>
    </div>
  );
}

/** Self-contained HH:MM:SS ticker — owns its own 1s interval, only re-renders itself. */
function DurationTimer() {
  const entryTime = useOptionTradeStore((s) => s.activeTrade?.entryTime ?? null);
  const exitTime  = useOptionTradeStore((s) => s.activeTrade?.exitTime ?? null);
  const isOpen    = useOptionTradeStore((s) => s.activeTrade?.status === 'OPEN');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  if (entryTime == null) return null;
  const elapsedMs = (isOpen ? now : exitTime ?? now) - entryTime;

  return <Metric label="Duration" value={formatHMS(elapsedMs)} accent={isOpen ? 'brand' : 'neutral'} icon={Clock} />;
}

/**
 * Live AI Confidence (%) for the open position's own strike/side — reuses
 * the existing, unmodified generateAISignal() (same scoring the AI Decision
 * Engine card uses), just targeted at this trade's contract instead of the
 * ATM strike. Freezes at its last value once the trade closes (the refresh
 * loop only runs while OPEN).
 */
function useLiveConfidence(
  data: OptionChainData | undefined,
  strike: number,
  side: OptionSide,
  isOpen: boolean,
): number | null {
  const [confidence, setConfidence] = useState<number | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!isOpen) return;

    const analyze = () => {
      const d = dataRef.current;
      if (!d) return;
      const row = d.strikes.find((s) => s.strike === strike);
      if (!row) return;
      const signal = generateAISignal({
        strike, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain, row,
      });
      const action = side === 'CE' ? 'BUY_CE' : 'BUY_PE';
      setConfidence(signal.scores.find((s) => s.action === action)?.confidence ?? null);
    };

    analyze();
    const id = setInterval(analyze, CONFIDENCE_REFRESH_MS);
    return () => clearInterval(id);
  }, [data, strike, side, isOpen]);

  return confidence;
}

// ── Main component ────────────────────────────────────────────────────────────
export function ActiveTradePanel({ data }: { data?: OptionChainData }) {
  const { activeTrade, exitTrade, dismissTrade } = useOptionTradeStore();
  const trailingStopEnabled = useAutoTradingStore((s) => s.trailingStopEnabled);

  const confidence = useLiveConfidence(
    data,
    activeTrade?.strike ?? 0,
    activeTrade?.side ?? 'CE',
    activeTrade?.status === 'OPEN',
  );

  // ── Empty state — card stays visible even with no open trade ─────────────
  if (!activeTrade) {
    return (
      <div className="rounded-2xl border border-ink-600/60 p-5 bg-ink-800/60 backdrop-blur-sm shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-brand-300" />
          <h3 className="font-display text-sm font-semibold text-ink-50">Active Trade</h3>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-8 px-2">
          <div className="h-10 w-10 rounded-xl bg-ink-700/60 border border-ink-600 flex items-center justify-center mb-3">
            <Activity size={18} className="text-ink-400" />
          </div>
          <p className="text-xs text-ink-300 leading-relaxed">
            No active trade. Click <span className="text-ink-100 font-medium">BUY</span> on any
            CE or PE strike to open a risk-managed paper position.
          </p>
        </div>
      </div>
    );
  }

  const {
    id, strike, side, expiry, entryPrice, currentLTP, stopLoss, target,
    lossPercent, profitPercent, lotSize, lots, quantity, investment,
    maxLossAmount, maxProfitAmount, status, entryTime, exitTime, exitTrigger,
    orderType, productType,
  } = activeTrade;

  // paperBrokerAdapter always mints "paper-<timestamp>-<random>" ids; a real
  // broker's order id never has that shape — this is the one existing,
  // reliable signal for whether this specific trade actually went to a live
  // broker (Paper Trading Only could have been toggled since the trade opened).
  const isPaperTrade = id.startsWith('paper-');

  const isOpen       = status === 'OPEN';
  const isSLHit      = status === 'SL_HIT';
  const isTarget     = status === 'TARGET_HIT';
  const isSquareOff  = status === 'AUTO_SQUARE_OFF';
  const isManualExit = status === 'MANUAL_EXIT';
  const isAIReversal = isManualExit && exitTrigger === 'AI_REVERSAL';
  const isExited     = !isOpen;

  const pnl    = (currentLTP - entryPrice) * quantity;
  const pnlPct = ((currentLTP - entryPrice) / entryPrice) * 100;
  const profit = pnl >= 0;

  // Trailing stop has engaged for this specific trade if the live stopLoss
  // sits above the originally-computed fixed-% stop (raiseStopLoss() only
  // ever ratchets it up — see optionTrade.store.ts).
  const originalStopLoss = +(entryPrice * (1 - lossPercent / 100)).toFixed(2);
  const trailingEngaged  = stopLoss > originalStopLoss + 0.005;

  // Risk : Reward — computed from live prices so it reflects a ratcheted
  // trailing stop (risk shrinks as the stop rises), not just the fixed %.
  const riskPerUnit   = entryPrice - stopLoss;
  const rewardPerUnit = target - entryPrice;
  const rrLabel = riskPerUnit > 0 ? `1 : ${(rewardPerUnit / riskPerUnit).toFixed(2)}` : 'Risk-Free';

  // Target Remaining / Stop Loss Distance — both direct from live prices.
  const targetRemainingRupees  = Math.max(0, (target - currentLTP) * quantity);
  const targetRemainingPercent = Math.max(0, ((target - currentLTP) / entryPrice) * 100);
  const slDistanceRupees       = Math.max(0, (currentLTP - stopLoss) * quantity);
  const slDistancePercent      = Math.max(0, ((currentLTP - stopLoss) / entryPrice) * 100);

  const stopLossLabel = trailingStopEnabled ? 'Trailing Stop' : 'Stop Loss';

  // Unified exit-reason vocabulary (Prompt 6, requirement 2).
  const exitReasonLabel =
    isTarget    ? `Target Hit (+${formatPct(profitPercent)}%)`
    : isSLHit     ? (trailingEngaged ? 'Trailing Stop Hit' : `Stop Loss Hit (-${formatPct(lossPercent)}%)`)
    : isSquareOff ? 'End of Day Exit'
    : isManualExit ? (isAIReversal ? 'AI Reversal Exit' : 'Manual Exit')
    : '';

  // Progress bar: 0 = at SL, 100 = at target
  const range  = target - stopLoss;
  const barPct = Math.min(100, Math.max(0, ((currentLTP - stopLoss) / range) * 100));

  const timeFmt = (ms: number) =>
    new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date(ms));

  const entryStr = timeFmt(entryTime);
  const exitStr  = exitTime ? timeFmt(exitTime) : '—';

  // Status badge config
  const badgeClass = isOpen
    ? 'bg-brand-400/10 text-brand-300 border-brand-400/30'
    : isSLHit
    ? 'bg-loss-subtle text-loss border-loss-border'
    : isTarget
    ? 'bg-gain-subtle text-gain border-gain-border'
    : isSquareOff
    ? 'bg-brand-400/10 text-brand-300 border-brand-400/30'
    : isAIReversal
    ? 'bg-brand-400/10 text-brand-300 border-brand-400/30'
    : 'bg-ink-700 text-ink-300 border-ink-600';

  const panelBorder = isOpen
    ? 'border-brand-400/30'
    : isSLHit
    ? 'border-loss/40'
    : isTarget
    ? 'border-gain/40'
    : 'border-ink-600/60';

  return (
    <AnimatePresence>
      <motion.div
        key="active-trade"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={cn(
            'rounded-2xl border p-4 bg-ink-800/60 backdrop-blur-sm shadow-card',
            panelBorder,
          )}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-brand-300 shrink-0" />
              <h3 className="font-display text-sm font-semibold text-ink-50">Active Trade</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {isOpen && (
                <button
                  type="button"
                  onClick={() => exitTrade()}
                  title="Manual Exit"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-medium text-ink-200 border border-ink-600 hover:border-ink-400 hover:text-ink-50 bg-ink-700/60 transition-colors"
                >
                  <LogOut size={11} />
                  Exit
                </button>
              )}
              {isExited && (
                <button
                  type="button"
                  onClick={dismissTrade}
                  className="p-1.5 rounded-lg text-ink-300 hover:text-ink-50 hover:bg-ink-700 transition-colors"
                  aria-label="Dismiss trade panel"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ── Status + paper badge ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-2xs font-bold uppercase tracking-wider',
                badgeClass,
              )}
            >
              {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />}
              {isSLHit     && <AlertTriangle size={10} />}
              {isTarget    && <CheckCircle2 size={10} />}
              {isSquareOff && <Clock size={10} />}
              {isManualExit && !isAIReversal && <Shield size={10} />}
              {isAIReversal && <RefreshCw size={10} />}

              {isOpen && 'Live Trade'}
              {!isOpen && (isSLHit ? <>🔴 {exitReasonLabel}</> : isTarget ? <>🟢 {exitReasonLabel}</> : exitReasonLabel)}
            </span>
            <span
              className={cn(
                'text-2xs px-2 py-1 rounded-lg font-medium border',
                isPaperTrade
                  ? 'bg-ink-700/80 text-ink-300 border-ink-600'
                  : 'bg-loss-subtle text-loss border-loss-border',
              )}
            >
              {isPaperTrade ? 'PAPER TRADING' : 'LIVE ORDER'}
            </span>
          </div>

          {/* ── Trade identity ──────────────────────────────────────────────── */}
          <div className="mb-3">
            <span className="font-display text-lg font-bold text-ink-50 tracking-tight">
              NIFTY {formatIndianNumber(strike, 0)}{' '}
              <span className={side === 'CE' ? 'text-loss' : 'text-gain'}>{side}</span>
            </span>
            <div className="text-ink-300 text-xs mt-0.5">{expiry}</div>
          </div>

          {/* ── Metrics — stacked 2-col grid, sidebar-friendly ───────────────── */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Metric label="Entry Price" value={`₹${formatIndianNumber(entryPrice)}`} />

            <Metric
              label="Current LTP"
              value={`₹${formatIndianNumber(currentLTP)}`}
              accent={profit ? 'gain' : 'loss'}
            />

            <Metric label="Quantity" value={String(quantity)} />

            <Metric label="Investment" value={`₹${formatIndianNumber(investment, 0)}`} accent="brand" />

            <Metric
              label="Live P&L (₹)"
              value={`${pnl >= 0 ? '+' : ''}₹${formatIndianNumber(Math.abs(pnl), 0)}`}
              accent={profit ? 'gain' : 'loss'}
              tint
            />

            <Metric
              label="Live P&L (%)"
              value={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
              accent={profit ? 'gain' : 'loss'}
              tint
            />

            <Metric
              label={`${stopLossLabel} (${formatPct(lossPercent)}%)`}
              value={`₹${formatIndianNumber(stopLoss)}`}
              accent="loss"
              icon={TrendingDown}
            />

            <Metric
              label={`Target (${formatPct(profitPercent)}%)`}
              value={`₹${formatIndianNumber(target)}`}
              accent="gain"
              icon={Target}
            />

            <Metric
              label="AI Confidence"
              value={confidence != null ? `${confidence}%` : '—'}
              accent="brand"
              icon={Gauge}
            />

            <Metric label="Risk : Reward" value={rrLabel} accent="brand" icon={Scale} />

            <Metric
              label="Target Remaining"
              value={`₹${formatIndianNumber(targetRemainingRupees, 0)} (${targetRemainingPercent.toFixed(2)}%)`}
              accent="gain"
              icon={Flag}
            />

            <Metric
              label="Stop Loss Distance"
              value={`₹${formatIndianNumber(slDistanceRupees, 0)} (${slDistancePercent.toFixed(2)}%)`}
              accent="loss"
              icon={ShieldAlert}
            />

            <Metric label="Max Loss ₹" value={`₹${formatIndianNumber(maxLossAmount, 0)}`} accent="loss" />

            <Metric label="Max Profit ₹" value={`₹${formatIndianNumber(maxProfitAmount, 0)}`} accent="gain" />

            <Metric label="Lot Size" value={String(lotSize)} />

            <Metric label="Lots" value={String(lots)} />

            <Metric label="Order Type" value={orderType} />

            <Metric label="Product Type" value={productType === 'CARRYFORWARD' ? 'NRML' : 'MIS'} />

            <Metric label="Broker Order ID" value={id} />

            <Metric
              label="Trade Status"
              value={
                isOpen      ? 'ACTIVE'
                : isSLHit     ? 'STOP LOSS HIT'
                : isTarget    ? 'TARGET HIT'
                : isSquareOff ? 'SQUARE OFF'
                : 'EXITED'
              }
              accent={isOpen ? 'brand' : isTarget ? 'gain' : isSLHit ? 'loss' : 'neutral'}
            />

            {isExited && <Metric label="Exit Reason" value={exitReasonLabel} accent="neutral" />}

            <DurationTimer />

            <Metric label="Entry Time" value={entryStr} />

            <Metric label="Exit Time" value={exitStr} />
          </div>

          {/* ── Live progress bar (OPEN only) ───────────────────────────────── */}
          {isOpen && (
            <div>
              <div className="flex justify-between items-center text-2xs mb-1.5">
                <span className="text-loss font-medium">SL (-{formatPct(lossPercent)}%)</span>
                <span className={cn('font-mono font-semibold', profit ? 'text-gain' : 'text-loss')}>
                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                </span>
                <span className="text-gain font-medium">Target (+{formatPct(profitPercent)}%)</span>
              </div>

              {/* Track */}
              <div className="relative h-2.5 rounded-full bg-ink-700 overflow-hidden">
                {/* Danger zone */}
                <div className="absolute left-0 top-0 h-full w-[25%] bg-loss/20 rounded-l-full" />
                {/* Safe zone */}
                <div className="absolute right-0 top-0 h-full w-[25%] bg-gain/20 rounded-r-full" />
                {/* Filled track */}
                <motion.div
                  className={cn(
                    'absolute left-0 top-0 h-full rounded-full transition-colors',
                    barPct < 25  ? 'bg-loss/60'
                    : barPct > 75 ? 'bg-gain/60'
                    : 'bg-brand-400/50',
                  )}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                {/* Thumb */}
                <motion.div
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-1.5 rounded-full shadow-md',
                    barPct < 25  ? 'bg-loss'
                    : barPct > 75 ? 'bg-gain'
                    : 'bg-brand-400',
                  )}
                  animate={{ left: `${barPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              <div className="flex justify-between text-2xs text-ink-400 mt-1">
                <span>−{formatPct(lossPercent)}%</span>
                <span>entry</span>
                <span>+{formatPct(profitPercent)}%</span>
              </div>
            </div>
          )}

          {/* ── Exit result banner (SL / Target / Trailing / AI Reversal / Manual / Square-off) ──────── */}
          {isExited && (
            <div
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border',
                isSLHit     && 'bg-loss-subtle border-loss-border',
                isTarget    && 'bg-gain-subtle border-gain-border',
                isSquareOff && 'bg-brand-400/8 border-brand-400/30',
                isManualExit && !isAIReversal && 'bg-ink-700/40 border-ink-600',
                isAIReversal && 'bg-brand-400/8 border-brand-400/30',
              )}
            >
              {isSLHit     && <AlertTriangle size={16} className="text-loss shrink-0 mt-0.5" />}
              {isTarget    && <CheckCircle2 size={16} className="text-gain shrink-0 mt-0.5" />}
              {isSquareOff && <Clock size={16} className="text-brand-300 shrink-0 mt-0.5" />}
              {isManualExit && !isAIReversal && (
                <Shield size={16} className="text-ink-300 shrink-0 mt-0.5" />
              )}
              {isAIReversal && <RefreshCw size={16} className="text-brand-300 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isSLHit  ? 'text-loss'
                    : isTarget ? 'text-gain'
                    : isSquareOff ? 'text-brand-300'
                    : isAIReversal ? 'text-brand-300'
                    : 'text-ink-100',
                  )}
                >
                  {isSLHit     ? <>{trailingEngaged ? '🟠' : '🔴'} {exitReasonLabel.toUpperCase()}</>
                   : isTarget    ? <>🟢 {exitReasonLabel.toUpperCase()}</>
                   : exitReasonLabel}
                </div>
                <div className="text-2xs text-ink-300 mt-0.5">
                  Closed at ₹{formatIndianNumber(currentLTP)} ·{' '}
                  <span className={cn('font-medium', profit ? 'text-gain' : 'text-loss')}>
                    {pnl >= 0 ? '+' : ''}₹{formatIndianNumber(Math.abs(pnl), 0)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                  </span>
                  {' '}· saved to history.
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
