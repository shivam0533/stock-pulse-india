import { Link } from 'react-router-dom';
import { ArrowRight, Wallet2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { PriceChange } from '@components/common/PriceChange';
import { usePortfolio } from '@hooks/usePortfolio';
import { formatINR, formatIndianNumber } from '@utils/format';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';

export function ActivePositions() {
  const { data, isLoading } = usePortfolio();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet2 size={16} className="text-brand-300" />
          Active Positions
        </CardTitle>
        <Link
          to={ROUTES.PORTFOLIO}
          className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
        >
          View all <ArrowRight size={12} />
        </Link>
      </CardHeader>

      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_1fr] gap-3 px-5 py-2.5 border-b border-ink-600/40 text-2xs uppercase tracking-wide text-ink-300">
        <div>Stock</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Avg Cost</div>
        <div className="text-right">LTP</div>
        <div className="text-right">P&amp;L</div>
      </div>

      <div>
        {isLoading || !data
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-4 w-28 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : data.holdings.map((h) => {
              const positive = h.pnl >= 0;
              return (
                <Link
                  key={h.symbol}
                  to={`/stock/${h.symbol}`}
                  className="grid grid-cols-2 md:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_1fr] gap-3 px-5 py-3.5 hover:bg-ink-700/40 transition-colors border-b border-ink-600/30 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-sm text-ink-50">{h.symbol}</div>
                    <div className="text-2xs text-ink-300 truncate">{h.name}</div>
                  </div>
                  <div className="hidden md:block text-right font-mono text-sm text-ink-100 tabular-nums">
                    {h.quantity}
                  </div>
                  <div className="hidden md:block text-right font-mono text-sm text-ink-100 tabular-nums">
                    ₹{formatIndianNumber(h.avgPrice)}
                  </div>
                  <div className="hidden md:block text-right font-mono text-sm text-ink-100 tabular-nums">
                    ₹{formatIndianNumber(h.currentPrice)}
                  </div>
                  <div className="text-right">
                    <div className={cn('font-mono text-sm font-medium tabular-nums', positive ? 'text-gain' : 'text-loss')}>
                      {positive ? '+' : ''}{formatINR(h.pnl, { compact: true })}
                    </div>
                    <PriceChange change={h.pnl} changePercent={h.pnlPercent} showArrow={false} size="xs" className="justify-end" />
                  </div>
                </Link>
              );
            })}
      </div>
    </Card>
  );
}
