import { useEffect, useRef, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Card, Badge } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminPagination } from '@components/admin/AdminPagination';
import { adminService } from '@services/admin.service';
import { formatIndianNumber, formatDate, formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AdminTradeEntry } from '@/types';

const PAGE_SIZE = 20;
type PaperFilter = 'ALL' | 'LIVE' | 'PAPER';

export default function AdminTrades() {
  const [items, setItems] = useState<AdminTradeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<PaperFilter>('LIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestTokenRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    const token = ++requestTokenRef.current;
    const isPaper = filter === 'ALL' ? undefined : filter === 'PAPER';
    adminService.listTrades({ page, pageSize: PAGE_SIZE, isPaper })
      .then((res) => {
        if (requestTokenRef.current !== token) return;
        setItems(res.items); setTotal(res.total); setError(null);
      })
      .catch((err) => {
        if (requestTokenRef.current !== token) return;
        setError(err.message ?? 'Failed to load trades');
      })
      .finally(() => {
        if (requestTokenRef.current === token) setLoading(false);
      });
  }, [page, filter]);

  const handleFilter = (f: PaperFilter) => { setFilter(f); setPage(1); };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <AdminPageHeader icon={ClipboardList} title="Trades" subtitle="Every user's trade history" />

      <div className="flex gap-1.5">
        {(['LIVE', 'PAPER', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => handleFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filter === f ? 'bg-brand-400/20 text-brand-300 border-brand-400/40' : 'border-ink-600 text-ink-300 hover:text-ink-50',
            )}
          >
            {f === 'LIVE' ? 'Live' : f === 'PAPER' ? 'Paper' : 'All'}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-600/40">
          <span className="font-display text-sm font-semibold text-ink-50">{total} Trade{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-ink-600/30 bg-ink-800/50">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Strike / Side</th>
                <th className="px-4 py-3 text-right">Entry → Exit</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">P&amp;L</th>
                <th className="px-4 py-3 text-center">Exit</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-left">Exit Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-ink-300">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-loss">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-ink-300">No trades found.</td></tr>
              ) : (
                items.map((t) => {
                  const profit = t.pnlAmount >= 0;
                  return (
                    <tr key={t.id} className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm text-ink-50">{t.userName}</div>
                        <div className="text-2xs text-ink-400">{t.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-bold text-ink-50 tabular-nums">{formatIndianNumber(t.strike, 0)}</span>
                          <span className={cn(
                            'text-2xs font-bold px-1.5 py-0.5 rounded border shrink-0',
                            t.side === 'CE' ? 'text-loss bg-loss-subtle border-loss-border' : 'text-gain bg-gain-subtle border-gain-border',
                          )}>
                            {t.side}
                          </span>
                        </div>
                        <div className="text-2xs text-ink-300 mt-0.5">{t.expiry}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(t.entryPrice)}</div>
                        <div className="text-2xs text-ink-400 tabular-nums">→ ₹{formatIndianNumber(t.exitPrice)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums">{t.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <div className={cn('font-mono text-sm font-semibold tabular-nums', profit ? 'text-gain' : 'text-loss')}>
                          {profit ? '+' : ''}₹{formatIndianNumber(t.pnlAmount, 0)}
                        </div>
                        <div className={cn('text-2xs font-mono tabular-nums', profit ? 'text-gain' : 'text-loss')}>
                          {profit ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={t.exitKind === 'STOP_LOSS' ? 'loss' : t.exitKind === 'TARGET' ? 'gain' : 'default'}>
                          {t.exitKind.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={t.isPaper ? 'default' : 'gain'}>{t.isPaper ? 'Paper' : 'Live'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-300 whitespace-nowrap">
                        {formatDate(t.exitTime)} {formatTime(t.exitTime)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </Card>
    </div>
  );
}
