import { ListOrdered } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '@components/ui';
import { useOpenOrders } from '@hooks/useDashboard';
import { formatIndianNumber, formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { OrderStatus } from '@/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  PARTIAL: 'Partially Filled',
};

export function OpenOrders() {
  const { data, isLoading } = useOpenOrders();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered size={16} className="text-brand-300" />
          Open Orders
        </CardTitle>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">
          {data?.length ?? 0} active
        </span>
      </CardHeader>
      <div>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          : data?.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-ink-200">
                No open orders right now.
              </div>
            ) : (
              data?.map((order) => {
                const fillPct = order.quantity
                  ? Math.round((order.filledQuantity / order.quantity) * 100)
                  : 0;
                return (
                  <div
                    key={order.id}
                    className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={order.side === 'BUY' ? 'gain' : 'loss'}>{order.side}</Badge>
                        <div className="min-w-0">
                          <div className="font-display text-sm font-semibold text-ink-50">
                            {order.symbol}
                          </div>
                          <div className="text-2xs text-ink-300">
                            {order.orderType} · {formatRelativeTime(order.placedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-ink-50 tabular-nums">
                          ₹{formatIndianNumber(order.price)}
                        </div>
                        <Badge variant={order.status === 'PARTIAL' ? 'amber' : 'neutral'} className="mt-0.5">
                          {STATUS_LABEL[order.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full bg-brand-400')}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="text-2xs text-ink-300 font-mono tabular-nums shrink-0">
                        {order.filledQuantity}/{order.quantity}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
      </div>
    </Card>
  );
}
