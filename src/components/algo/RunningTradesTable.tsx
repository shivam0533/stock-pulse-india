import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@utils/cn';
import { formatIndianNumber } from '@utils/format';
import type { BotTrade } from '@/types';

interface RunningTradesTableProps {
  trades: BotTrade[];
  isRunning: boolean;
}

export function RunningTradesTable({ trades, isRunning }: RunningTradesTableProps) {
  return (
    <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600/40">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-ink-50">Running Trades</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-2xs text-gain font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
              {trades.length} Active
            </span>
          )}
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-300">
          {isRunning ? 'No open positions' : 'Bot is stopped'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-ink-600/30">
                {['Symbol', 'Side', 'Qty', 'Entry', 'LTP', 'P&L', 'Signal', 'SL / Tgt'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-2xs text-ink-300 uppercase tracking-wide font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {trades.map((t) => {
                  const pos = t.pnl >= 0;
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/30 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <Link to={`/stock/${t.symbol}`} className="group">
                          <div className="font-display text-sm font-semibold text-ink-50 group-hover:text-brand-300 transition-colors">
                            {t.symbol}
                          </div>
                          <div className="text-2xs text-ink-300 truncate max-w-[100px]">{t.name}</div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          t.side === 'BUY' ? 'bg-gain-subtle text-gain' : 'bg-loss-subtle text-loss',
                        )}>
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink-100 tabular-nums">{t.quantity}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink-100 tabular-nums">
                        ₹{formatIndianNumber(t.entryPrice)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink-50 tabular-nums font-medium">
                        ₹{formatIndianNumber(t.currentPrice)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={cn('flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums', pos ? 'text-gain' : 'text-loss')}>
                          {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {pos ? '+' : ''}₹{Math.abs(t.pnl).toFixed(2)}
                        </div>
                        <div className={cn('text-2xs font-mono', pos ? 'text-gain/80' : 'text-loss/80')}>
                          {pos ? '+' : ''}{t.pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-2xs text-brand-300 bg-brand-400/10 px-1.5 py-0.5 rounded border border-brand-400/20">
                          {t.strategySignal}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-2xs tabular-nums">
                        <div className="text-loss">SL ₹{formatIndianNumber(t.stopLoss, 0)}</div>
                        <div className="text-gain">T ₹{formatIndianNumber(t.target, 0)}</div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
