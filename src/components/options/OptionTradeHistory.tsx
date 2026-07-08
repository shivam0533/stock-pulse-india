import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Shield, Trash2 } from 'lucide-react';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function OptionTradeHistory() {
  const { history, clearHistory } = useOptionTradeStore();

  return (
    <div className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600/40">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-brand-300" />
          <h3 className="text-sm font-semibold text-ink-100">Trade History</h3>
          <span className="text-2xs bg-ink-700 text-ink-300 border border-ink-600 px-2 py-0.5 rounded-md tabular-nums">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="flex items-center gap-1 text-2xs text-ink-300 hover:text-loss transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {history.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ink-300">
          No completed trades yet. Closed positions will appear here.
        </p>
      ) : (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-ink-600/25">
          {history.map((t, i) => {
            const profit    = t.pnlPercent >= 0;
            const isSL      = t.exitKind === 'STOP_LOSS';
            const isTarget  = t.exitKind === 'TARGET';
            const isSquareOff = t.exitKind === 'AUTO_SQUARE_OFF';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 5) * 0.03 }}
                className="px-4 py-3 space-y-1.5 hover:bg-ink-700/20 transition-colors"
              >
                {/* Strike / side + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-sm font-semibold text-ink-50 tabular-nums">
                      {formatIndianNumber(t.strike, 0)}
                    </span>
                    <span
                      className={cn(
                        'text-2xs font-bold px-1.5 py-0.5 rounded border shrink-0',
                        t.side === 'CE'
                          ? 'text-loss bg-loss-subtle border-loss-border'
                          : 'text-gain bg-gain-subtle border-gain-border',
                      )}
                    >
                      {t.side}
                    </span>
                    <span className="text-2xs text-ink-400 truncate">{t.expiry}</span>
                  </div>
                  <span className="text-2xs text-ink-400 whitespace-nowrap shrink-0">
                    {new Intl.DateTimeFormat('en-IN', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                    }).format(new Date(t.exitTime))}
                  </span>
                </div>

                {/* Entry -> Exit */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-ink-200 tabular-nums">
                    ₹{formatIndianNumber(t.entryPrice)} → ₹{formatIndianNumber(t.exitPrice)}
                  </span>
                  <span className="text-2xs text-ink-400">
                    {formatDuration(t.exitTime - t.entryTime)}
                  </span>
                </div>

                {/* Quantity / Investment */}
                <div className="flex items-center justify-between text-2xs text-ink-300">
                  <span>{t.lots} lot{t.lots > 1 ? 's' : ''} · qty {t.quantity}</span>
                  <span>₹{formatIndianNumber(t.investment, 0)} invested</span>
                </div>

                {/* Order type / Product type / Broker Order ID */}
                <div className="flex items-center justify-between text-2xs text-ink-400">
                  <span>{t.orderType} · {t.productType === 'CARRYFORWARD' ? 'NRML' : 'MIS'}</span>
                  <span className="font-mono truncate max-w-[45%]" title={t.id}>#{t.id}</span>
                </div>

                {/* Gross P&L ₹ and % */}
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('font-mono tabular-nums', profit ? 'text-gain' : 'text-loss')}>
                    {t.pnlAmount >= 0 ? '+' : ''}₹{formatIndianNumber(Math.abs(t.pnlAmount), 0)}
                  </span>
                  <span className={cn('font-mono font-semibold tabular-nums', profit ? 'text-gain' : 'text-loss')}>
                    {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                  </span>
                </div>

                {/* Exit reason badge */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-lg border',
                    isSL
                      ? 'text-loss bg-loss-subtle border-loss-border'
                      : isTarget
                      ? 'text-gain bg-gain-subtle border-gain-border'
                      : isSquareOff
                      ? 'text-brand-300 bg-brand-400/10 border-brand-400/30'
                      : 'text-ink-300 bg-ink-700/40 border-ink-600',
                  )}
                >
                  {isSL && <AlertTriangle size={9} />}
                  {isTarget && <CheckCircle2 size={9} />}
                  {isSquareOff && <Clock size={9} />}
                  {!isSL && !isTarget && !isSquareOff && <Shield size={9} />}
                  {t.exitReason}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="px-4 py-2.5 border-t border-ink-600/20">
        <p className="text-2xs text-ink-400">
          Includes both paper and live orders placed from Option Chain, depending on the Paper Trading Only setting.
        </p>
      </div>
    </div>
  );
}
