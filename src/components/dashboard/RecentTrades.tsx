import { History } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '@components/ui';
import { useRecentTrades } from '@hooks/useDashboard';
import { formatINR, formatIndianNumber, formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';

export function RecentTrades() {
  const { data, isLoading } = useRecentTrades();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History size={16} className="text-brand-300" />
          Recent Trades
        </CardTitle>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">Today</span>
      </CardHeader>
      <div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          : data?.map((trade) => {
              const positive = trade.pnl >= 0;
              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-ink-600/30 last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={trade.side === 'BUY' ? 'gain' : 'loss'}>{trade.side}</Badge>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold text-ink-50">{trade.symbol}</div>
                      <div className="text-2xs text-ink-300">
                        {trade.quantity} @ ₹{formatIndianNumber(trade.price)} · {formatRelativeTime(trade.executedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-ink-50 tabular-nums">
                      {formatINR(trade.value, { compact: true })}
                    </div>
                    <div className={cn('font-mono text-2xs tabular-nums', positive ? 'text-gain' : 'text-loss')}>
                      {positive ? '+' : ''}{formatINR(trade.pnl, { compact: true })}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}
