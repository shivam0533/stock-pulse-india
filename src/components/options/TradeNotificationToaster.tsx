import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  RefreshCw,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useOptionTradeStore } from '@store/optionTrade.store';
import {
  useTradeNotificationStore,
  type TradeNotification,
  type TradeNotificationKind,
} from '@store/tradeNotification.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';

const KIND_CONFIG: Record<TradeNotificationKind, {
  icon: typeof CheckCircle2;
  title: string;
  dot: string;
  className: string;
}> = {
  BUY:            { icon: TrendingUp,   title: '🟢 Trade Executed Successfully', dot: 'bg-gain',      className: 'border-gain-border bg-gain-subtle' },
  TARGET:         { icon: CheckCircle2, title: '🟢 Target Hit',                  dot: 'bg-gain',      className: 'border-gain-border bg-gain-subtle' },
  STOP_LOSS:      { icon: ShieldAlert,  title: '🔴 Stop Loss Hit',                dot: 'bg-loss',      className: 'border-loss-border bg-loss-subtle' },
  TRAILING_STOP:  { icon: TrendingDown, title: '🟠 Trailing Stop Hit',           dot: 'bg-brand-400', className: 'border-brand-400/30 bg-brand-400/10' },
  AI_REVERSAL:    { icon: RefreshCw,    title: '🔵 AI Reversal Exit',            dot: 'bg-brand-400', className: 'border-brand-400/30 bg-brand-400/10' },
  MANUAL_EXIT:    { icon: Shield,       title: '⚪ Manual Exit',                 dot: 'bg-ink-400',   className: 'border-ink-600 bg-ink-700/80' },
};

const timeFmt = (ms: number) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(ms));

function NotificationCard({ n, onClose }: { n: TradeNotification; onClose: () => void }) {
  const { icon: Icon, title, className } = KIND_CONFIG[n.kind];
  const isExit = n.kind !== 'BUY';
  const profit = (n.pnlAmount ?? 0) >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative w-full max-w-xs sm:max-w-sm rounded-2xl border shadow-card backdrop-blur-sm p-4 pointer-events-auto',
        'bg-ink-800/95',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="absolute top-2.5 right-2.5 p-1 rounded-lg text-ink-300 hover:text-ink-50 hover:bg-ink-700/60 transition-colors"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-2 pr-6 mb-2.5">
        <Icon size={16} className="shrink-0 text-ink-50" />
        <span className="font-display text-sm font-semibold text-ink-50">{title}</span>
      </div>

      <div className="mb-2">
        <span className={cn('text-2xs font-bold px-2 py-0.5 rounded-md border', n.side === 'CE' ? 'text-loss bg-loss-subtle border-loss-border' : 'text-gain bg-gain-subtle border-gain-border')}>
          BUY
        </span>
        <span className="ml-2 font-mono text-sm font-semibold text-ink-50">
          NIFTY {formatIndianNumber(n.strike, 0)} {n.side}
        </span>
      </div>

      <div className="space-y-1 text-xs text-ink-200">
        <div className="flex items-center justify-between">
          <span className="text-ink-400">Lots</span>
          <span className="font-mono tabular-nums text-ink-100">{n.lots}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">Quantity</span>
          <span className="font-mono tabular-nums text-ink-100">{n.quantity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">{isExit ? 'Exit Price' : 'Entry Price'}</span>
          <span className="font-mono tabular-nums text-ink-100">₹{formatIndianNumber(n.price)}</span>
        </div>
        {isExit && n.pnlAmount !== undefined && n.pnlPercent !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-ink-400">P&amp;L</span>
            <span className={cn('font-mono font-semibold tabular-nums', profit ? 'text-gain' : 'text-loss')}>
              {profit ? '+' : ''}₹{formatIndianNumber(Math.abs(n.pnlAmount), 0)} ({profit ? '+' : ''}{n.pnlPercent.toFixed(2)}%)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-ink-400">Time</span>
          <span className="font-mono tabular-nums text-ink-100">{timeFmt(n.time)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Trade Popup Notification feature. Purely additive — watches the existing,
 * unmodified optionTrade.store for BUY / Target / Stop Loss / Trailing Stop /
 * AI Reversal / Manual Exit transitions and renders a rich popup for each.
 * Does not alter any existing component, store action, or page; mounted
 * once, globally, in AppLayout so it works everywhere (Paper and Live).
 */
export function TradeNotificationToaster() {
  const activeTrade = useOptionTradeStore((s) => s.activeTrade);
  const notifications = useTradeNotificationStore((s) => s.notifications);
  const push = useTradeNotificationStore((s) => s.push);
  const dismiss = useTradeNotificationStore((s) => s.dismiss);
  const prevRef = useRef<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!activeTrade) {
      prevRef.current = null;
      return;
    }

    const prev = prevRef.current;
    const isNewTrade = !prev || prev.id !== activeTrade.id;

    if (isNewTrade) {
      if (activeTrade.status === 'OPEN') {
        push({
          kind: 'BUY',
          strike: activeTrade.strike,
          side: activeTrade.side,
          lots: activeTrade.lots,
          quantity: activeTrade.quantity,
          price: activeTrade.entryPrice,
          time: activeTrade.entryTime,
        });
      }
    } else if (prev.status !== activeTrade.status) {
      const pnlAmount = (activeTrade.currentLTP - activeTrade.entryPrice) * activeTrade.quantity;
      const pnlPercent = ((activeTrade.currentLTP - activeTrade.entryPrice) / activeTrade.entryPrice) * 100;
      const time = activeTrade.exitTime ?? Date.now();
      const base = {
        strike: activeTrade.strike,
        side: activeTrade.side,
        lots: activeTrade.lots,
        quantity: activeTrade.quantity,
        price: activeTrade.currentLTP,
        pnlAmount,
        pnlPercent,
        time,
      };

      if (activeTrade.status === 'TARGET_HIT') {
        push({ ...base, kind: 'TARGET' });
      } else if (activeTrade.status === 'SL_HIT') {
        // Trailing Stop only ever ratchets stopLoss upward (raiseStopLoss()
        // in optionTrade.store.ts) — if it now sits above the originally
        // computed fixed-% stop, this exit was a trailing-stop hit.
        const originalStopLoss = +(activeTrade.entryPrice * (1 - activeTrade.lossPercent / 100)).toFixed(2);
        const trailingEngaged = activeTrade.stopLoss > originalStopLoss + 0.005;
        push({ ...base, kind: trailingEngaged ? 'TRAILING_STOP' : 'STOP_LOSS' });
      } else if (activeTrade.status === 'MANUAL_EXIT') {
        push({ ...base, kind: activeTrade.exitTrigger === 'AI_REVERSAL' ? 'AI_REVERSAL' : 'MANUAL_EXIT' });
      }
      // AUTO_SQUARE_OFF intentionally has no popup — not part of this feature's requested list.
    }

    prevRef.current = { id: activeTrade.id, status: activeTrade.status };
  }, [activeTrade, push]);

  return (
    <div className="fixed top-20 right-4 z-[70] flex flex-col gap-2 w-full max-w-xs sm:max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <NotificationCard key={n.id} n={n} onClose={() => dismiss(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
