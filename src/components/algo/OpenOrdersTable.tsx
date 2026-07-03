import { ListOrdered } from 'lucide-react';
import { formatIndianNumber, formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AlgoOrder, AlgoOrderStatus } from '@/types';

const STATUS_STYLE: Record<AlgoOrderStatus, string> = {
  PENDING: 'bg-ink-700 text-ink-200 border-ink-600',
  PARTIAL: 'bg-brand-400/15 text-brand-300 border-brand-400/30',
  OPEN:    'bg-gain-subtle text-gain border-gain-border',
};

interface OpenOrdersTableProps {
  orders: AlgoOrder[];
  isRunning?: boolean;
}

export function OpenOrdersTable({ orders }: OpenOrdersTableProps) {
  return (
    <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600/40">
        <div className="flex items-center gap-2">
          <ListOrdered size={15} className="text-brand-300" />
          <span className="font-display text-sm font-semibold text-ink-50">Open Orders</span>
        </div>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">{orders.length} Active</span>
      </div>

      {orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-300">No pending orders</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-ink-600/30">
                {['Symbol', 'Side', 'Type', 'Qty', 'Filled', 'Price', 'Status', 'Placed', 'Reason'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-2xs text-ink-300 uppercase tracking-wide font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const fillPct = o.quantity > 0 ? Math.round((o.filledQty / o.quantity) * 100) : 0;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-display text-sm font-semibold text-ink-50">{o.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded',
                        o.side === 'BUY' ? 'bg-gain-subtle text-gain' : 'bg-loss-subtle text-loss',
                      )}>
                        {o.side}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-2xs text-ink-200">{o.orderType}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-100 tabular-nums">{o.quantity}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-ink-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-400"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-2xs text-ink-200 tabular-nums">{o.filledQty}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-50 tabular-nums">
                      ₹{formatIndianNumber(o.price)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'inline-flex px-1.5 py-0.5 rounded text-2xs font-medium border',
                        STATUS_STYLE[o.status],
                      )}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-2xs text-ink-300">{formatRelativeTime(o.placedAt)}</td>
                    <td className="px-3 py-2.5 text-2xs text-ink-300 max-w-[140px] truncate">{o.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
