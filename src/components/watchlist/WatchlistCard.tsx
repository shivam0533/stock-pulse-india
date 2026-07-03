import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, ExternalLink, Star, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@utils/cn';
import { formatIndianNumber, formatPercent } from '@utils/format';
import type { Stock } from '@/types';
import type { WatchlistItem } from '@/types';

interface WatchlistCardProps {
  item: WatchlistItem;
  stock: Stock;
  livePrice: number;
  prevPrice: number;
  onRemove: () => void;
  onToggleFav: () => void;
  onAlertClick: () => void;
}

function PriceRangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low || 1;
  const pct = Math.min(100, Math.max(0, ((current - low) / range) * 100));
  return (
    <div className="flex items-center gap-2 text-2xs text-ink-300">
      <span className="tabular-nums font-mono">₹{formatIndianNumber(low, 0)}</span>
      <div className="flex-1 h-1 rounded-full bg-ink-700 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-loss/60 to-gain/60 rounded-full" style={{ width: '100%' }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-brand-400 border-2 border-ink-950 shadow-sm transition-all duration-500"
          style={{ left: `calc(${pct}% - 5px)` }}
        />
      </div>
      <span className="tabular-nums font-mono">₹{formatIndianNumber(high, 0)}</span>
    </div>
  );
}

export function WatchlistCard({
  item, stock, livePrice, prevPrice,
  onRemove, onToggleFav, onAlertClick,
}: WatchlistCardProps) {
  const priceUp   = livePrice > prevPrice;
  const priceDown = livePrice < prevPrice;
  const liveChange    = livePrice - stock.previousClose;
  const liveChangePct = (liveChange / stock.previousClose) * 100;
  const liveDayPos    = liveChange >= 0;

  const alert = item.priceAlert;
  const alertTriggered = alert?.triggered;
  const alertSet = !!alert && !alertTriggered;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        'relative group overflow-hidden rounded-2xl border bg-ink-800/60 backdrop-blur-sm flex flex-col',
        'transition-colors',
        alertTriggered
          ? 'border-brand-400/60 shadow-glow-amber'
          : 'border-ink-600/60 hover:border-ink-500',
      )}
    >
      {/* Price flash overlay */}
      <AnimatePresence>
        {(priceUp || priceDown) && (
          <motion.div
            initial={{ opacity: 0.18 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={cn(
              'absolute inset-0 pointer-events-none rounded-2xl',
              priceUp ? 'bg-gain' : 'bg-loss',
            )}
          />
        )}
      </AnimatePresence>

      {/* Alert triggered banner */}
      {alertTriggered && (
        <div className="bg-brand-400/20 border-b border-brand-400/40 px-3 py-1.5 flex items-center gap-2">
          <Bell size={12} className="text-brand-300 animate-pulse" />
          <span className="text-2xs text-brand-300 font-semibold">
            Alert triggered! Price {alert.direction === 'above' ? '≥' : '≤'} ₹{formatIndianNumber(alert.price, 0)}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold text-ink-50">{item.symbol}</span>
            <span className="text-2xs px-1.5 py-0.5 rounded bg-ink-700 text-ink-300 uppercase tracking-wide">
              {item.exchange}
            </span>
            {item.sector && (
              <span className="hidden sm:inline text-2xs px-1.5 py-0.5 rounded bg-ink-700 text-ink-300">
                {item.sector}
              </span>
            )}
          </div>
          <div className="text-xs text-ink-300 truncate mt-0.5 max-w-[180px]">{item.name}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Favourite */}
          <button
            type="button"
            onClick={onToggleFav}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              item.isFavourite
                ? 'text-brand-400'
                : 'text-ink-400 hover:text-brand-300',
            )}
            title={item.isFavourite ? 'Remove favourite' : 'Add to favourites'}
          >
            <Star size={15} fill={item.isFavourite ? 'currentColor' : 'none'} />
          </button>

          {/* Alert */}
          <button
            type="button"
            onClick={onAlertClick}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              alertTriggered ? 'text-brand-400 animate-pulse' :
              alertSet       ? 'text-brand-300' :
                              'text-ink-400 hover:text-brand-300',
            )}
            title={alertSet ? `Alert at ₹${alert!.price}` : 'Set price alert'}
          >
            {alertSet || alertTriggered ? <Bell size={15} /> : <BellOff size={15} />}
          </button>

          {/* Remove */}
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-ink-500 hover:text-loss hover:bg-loss-subtle transition-colors opacity-0 group-hover:opacity-100"
            title="Remove from watchlist"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="px-4 pb-1">
        <div className="flex items-baseline gap-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={livePrice.toFixed(2)}
              initial={{ opacity: 0.6, y: priceUp ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'font-mono text-2xl font-bold tabular-nums tracking-tight',
                priceUp ? 'text-gain' : priceDown ? 'text-loss' : 'text-ink-50',
              )}
            >
              ₹{formatIndianNumber(livePrice)}
            </motion.span>
          </AnimatePresence>
          <span className={cn(
            'flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums',
            liveDayPos ? 'text-gain' : 'text-loss',
          )}>
            {liveDayPos ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {formatPercent(liveChangePct)}
          </span>
        </div>
        <div className={cn('text-xs font-mono tabular-nums', liveDayPos ? 'text-gain/80' : 'text-loss/80')}>
          {liveDayPos ? '+' : ''}₹{formatIndianNumber(liveChange, 2)} today
        </div>
      </div>

      {/* Day range */}
      <div className="px-4 py-2">
        <PriceRangeBar low={stock.dayLow} high={stock.dayHigh} current={livePrice} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-ink-600/30 mt-auto">
        <div className="flex items-center gap-3 text-2xs text-ink-400 font-mono">
          <span>Vol {(stock.volume / 100000).toFixed(1)}L</span>
          {stock.pe && <span>PE {stock.pe}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-2xs text-gain font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
            LIVE
          </span>
          <Link
            to={`/stock/${item.symbol}`}
            className="p-1.5 rounded-lg text-ink-400 hover:text-brand-300 hover:bg-ink-700 transition-colors"
            title="View stock detail"
          >
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
