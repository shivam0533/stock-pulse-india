import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { PriceChange } from '@components/common/PriceChange';
import { useMostActive } from '@hooks/useDashboard';
import { formatCompactNumber, formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';

export function MostActiveStocks() {
  const { data, isLoading } = useMostActive();
  const maxVolume = Math.max(...(data?.map((s) => s.volume) ?? [1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={16} className="text-brand-300" />
          Most Active Stocks
        </CardTitle>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">By Volume</span>
      </CardHeader>
      <div>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-3 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          : data?.map((stock) => {
              const positive = stock.change >= 0;
              const widthPct = Math.max(6, Math.round((stock.volume / maxVolume) * 100));
              return (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol}`}
                  className="block px-5 py-3 hover:bg-ink-700/40 transition-colors border-b border-ink-600/30 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold text-ink-50">{stock.symbol}</div>
                      <div className="text-2xs text-ink-300 truncate max-w-[160px]">{stock.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm text-ink-50 tabular-nums">
                        ₹{formatIndianNumber(stock.price)}
                      </div>
                      <PriceChange change={stock.change} changePercent={stock.changePercent} showArrow={false} size="xs" className="justify-end" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', positive ? 'bg-gain' : 'bg-loss')}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-2xs text-ink-300 font-mono tabular-nums shrink-0">
                      {formatCompactNumber(stock.volume)}
                    </span>
                  </div>
                </Link>
              );
            })}
      </div>
    </Card>
  );
}
