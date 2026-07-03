import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { useTopMovers } from '@hooks/useStocks';
import { formatIndianNumber, formatPercent } from '@utils/format';
import { cn } from '@utils/cn';
import type { Stock } from '@/types';

interface MoverItemProps {
  stock: Stock;
  positive: boolean;
}

function MoverItem({ stock, positive }: MoverItemProps) {
  return (
    <Link
      to={`/stock/${stock.symbol}`}
      className="flex items-center justify-between px-5 py-3 hover:bg-ink-700/40 transition-colors border-b border-ink-600/30 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold text-ink-50">{stock.symbol}</div>
        <div className="text-xs text-ink-200 truncate max-w-[180px]">{stock.name}</div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <div className="font-mono text-sm text-ink-50 tabular-nums">
          ₹{formatIndianNumber(stock.price)}
        </div>
        <div className={cn(
          'flex items-center justify-end gap-0.5 text-xs font-medium tabular-nums',
          positive ? 'text-gain' : 'text-loss'
        )}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {formatPercent(stock.changePercent)}
        </div>
      </div>
    </Link>
  );
}

export function TopMovers() {
  const { data, isLoading } = useTopMovers();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gain" />
            Top Gainers
          </CardTitle>
          <span className="text-2xs text-ink-300 uppercase tracking-wide">Today</span>
        </CardHeader>
        <div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 border-b border-ink-600/30 last:border-b-0">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            : data?.gainers.map((s) => <MoverItem key={s.symbol} stock={s} positive />)}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-loss" />
            Top Losers
          </CardTitle>
          <span className="text-2xs text-ink-300 uppercase tracking-wide">Today</span>
        </CardHeader>
        <div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 border-b border-ink-600/30 last:border-b-0">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            : data?.losers.map((s) => <MoverItem key={s.symbol} stock={s} positive={false} />)}
        </div>
      </Card>
    </div>
  );
}
