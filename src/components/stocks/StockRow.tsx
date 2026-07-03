import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { PriceChange } from '@components/common/PriceChange';
import { useWatchlistStore } from '@store/watchlist.store';
import { formatIndianNumber, formatINR, formatCompactNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { Stock } from '@/types';

interface StockRowProps {
  stock: Stock;
  showSector?: boolean;
  showVolume?: boolean;
  showMarketCap?: boolean;
}

export function StockRow({
  stock,
  showSector = true,
  showVolume = true,
  showMarketCap = true,
}: StockRowProps) {
  const { has, toggle } = useWatchlistStore();
  const isWatched = has(stock.symbol);

  return (
    <Link
      to={`/stock/${stock.symbol}`}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 hover:bg-ink-700/40 transition-colors',
        'border-b border-ink-600/30 last:border-b-0'
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggle({ symbol: stock.symbol, name: stock.name, exchange: stock.exchange });
        }}
        className={cn(
          'p-1 rounded transition-colors',
          isWatched
            ? 'text-brand-400'
            : 'text-ink-300 hover:text-brand-400 opacity-0 group-hover:opacity-100'
        )}
        aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Star size={14} fill={isWatched ? 'currentColor' : 'none'} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-ink-50">
            {stock.symbol}
          </span>
          <span className="text-2xs text-ink-300 px-1.5 py-0.5 rounded bg-ink-700 uppercase tracking-wide">
            {stock.exchange}
          </span>
        </div>
        <div className="text-xs text-ink-200 truncate">{stock.name}</div>
      </div>

      {showSector && (
        <div className="hidden md:block w-24 text-xs text-ink-200 truncate">
          {stock.sector}
        </div>
      )}

      {showVolume && (
        <div className="hidden lg:block w-24 text-right">
          <div className="font-mono text-xs text-ink-100 tabular-nums">
            {formatCompactNumber(stock.volume)}
          </div>
          <div className="text-2xs text-ink-300">Volume</div>
        </div>
      )}

      {showMarketCap && (
        <div className="hidden lg:block w-28 text-right">
          <div className="font-mono text-xs text-ink-100 tabular-nums">
            {formatINR(stock.marketCap, { compact: true })}
          </div>
          <div className="text-2xs text-ink-300">Mkt Cap</div>
        </div>
      )}

      <div className="w-24 sm:w-28 text-right">
        <div className="font-mono text-sm text-ink-50 tabular-nums">
          ₹{formatIndianNumber(stock.price)}
        </div>
        <PriceChange
          change={stock.change}
          changePercent={stock.changePercent}
          showArrow={false}
          size="xs"
          className="justify-end"
        />
      </div>
    </Link>
  );
}
