import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDownUp, Download, Users as UsersIcon } from 'lucide-react';
import { Card, Badge, Avatar } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminSearchBar } from '@components/admin/AdminSearchBar';
import { AdminPagination } from '@components/admin/AdminPagination';
import { RoleBadge } from '@components/admin/RoleBadge';
import { adminService, type ListUsersParams } from '@services/admin.service';
import { formatDate, formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { AdminUserSummary } from '@/types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
type SortKey = NonNullable<ListUsersParams['sortBy']>;

const KYC_BADGE: Record<AdminUserSummary['kycStatus'], 'gain' | 'loss' | 'neutral'> = {
  verified: 'gain',
  rejected: 'loss',
  pending: 'neutral',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('joinedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Monotonic token guarding against an earlier, slower request's response
  // overwriting a later, faster one's (out-of-order network race).
  const requestTokenRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => {
      const token = ++requestTokenRef.current;
      adminService.listUsers({ page, pageSize: PAGE_SIZE, search: search || undefined, sortBy, sortDir })
        .then((res) => {
          if (requestTokenRef.current !== token) return;
          setItems(res.items); setTotal(res.total); setError(null);
        })
        .catch((err) => {
          if (requestTokenRef.current !== token) return;
          setError(err.message ?? 'Failed to load users');
        })
        .finally(() => {
          if (requestTokenRef.current === token) setLoading(false);
        });
    }, search ? SEARCH_DEBOUNCE_MS : 0); // only debounce actual typing, not page/sort clicks

    return () => clearTimeout(id);
  }, [page, search, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Exports every matching row across all pages, not just what's on
      // screen — loops the same paginated endpoint at its max page size
      // (100) until a short page signals the end, capped at 20k rows so a
      // malformed response can never spin this into an infinite loop.
      const all: AdminUserSummary[] = [];
      const exportPageSize = 100;
      for (let p = 1; p <= 200; p++) {
        const res = await adminService.listUsers({ page: p, pageSize: exportPageSize, search: search || undefined, sortBy, sortDir });
        all.push(...res.items);
        if (res.items.length < exportPageSize || all.length >= res.total) break;
      }
      const header = ['Name', 'Email', 'Phone', 'KYC Status', 'Role', 'Joined'];
      const rows = all.map((u) => [u.name, u.email, u.phone ?? '', u.kycStatus, u.role, new Date(u.joinedAt).toISOString()]);
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `admin-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      type="button"
      onClick={() => handleSort(k)}
      className="inline-flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-300 hover:text-ink-50 transition-colors select-none"
    >
      {label}
      <ArrowDownUp size={9} className={sortBy === k ? 'text-brand-300' : 'text-ink-600'} />
    </button>
  );

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <AdminPageHeader icon={UsersIcon} title="Users" subtitle="Every real account (backend/auth) — click a row for full details" />

      <div className="flex flex-wrap gap-2 items-center">
        <AdminSearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, email, or phone…" />
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-800 border border-ink-600/60 text-xs text-ink-200 hover:text-ink-50 hover:border-ink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-600/40">
          <span className="font-display text-sm font-semibold text-ink-50">{total} User{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-ink-600/30 bg-ink-800/50">
                <th className="px-4 py-3 text-left">Profile</th>
                <th className="px-4 py-3 text-left"><SortHeader label="Name" k="name" /></th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-left"><SortHeader label="Email" k="email" /></th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Broker Status</th>
                <th className="px-4 py-3 text-center"><SortHeader label="KYC Status" k="kycStatus" /></th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Today's Trades</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Today's P&L</th>
                <th className="px-4 py-3 text-center"><SortHeader label="Role" k="role" /></th>
                <th className="px-4 py-3 text-left"><SortHeader label="Joined" k="joinedAt" /></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-16 text-center text-sm text-ink-300">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={10} className="py-16 text-center text-sm text-loss">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="py-16 text-center text-sm text-ink-300">No users found.</td></tr>
              ) : (
                items.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(i, 10) * 0.02 }}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="group border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3"><Avatar name={u.name} size="sm" /></td>
                    <td className="px-4 py-3 text-sm text-ink-50 font-medium whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-ink-200 hidden md:table-cell whitespace-nowrap">{u.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-ink-200 whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <Badge variant={u.brokerConnected ? 'gain' : 'default'}>{u.brokerConnected ? 'Connected' : 'Disconnected'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={KYC_BADGE[u.kycStatus]}>{u.kycStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell font-mono text-xs text-ink-100 tabular-nums">
                      {u.todayTradeCount ?? 0}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right hidden lg:table-cell font-mono text-xs tabular-nums',
                      (u.todayPnlAmount ?? 0) >= 0 ? 'text-gain' : 'text-loss',
                    )}>
                      {(u.todayPnlAmount ?? 0) >= 0 ? '+' : ''}₹{formatIndianNumber(u.todayPnlAmount ?? 0, 0)}
                    </td>
                    <td className="px-4 py-3 text-center"><RoleBadge role={u.role} /></td>
                    <td className={cn('px-4 py-3 text-xs text-ink-300 whitespace-nowrap')}>{formatDate(u.joinedAt)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </Card>
    </div>
  );
}
