import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Card, Badge } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminPagination } from '@components/admin/AdminPagination';
import { AdminComingSoon } from '@components/admin/AdminComingSoon';
import { adminService } from '@services/admin.service';
import { formatDate, formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { LoginLogEntry, AdminLogEntry } from '@/types';

const PAGE_SIZE = 20;

type Tab = 'auth' | 'admin' | 'api' | 'broker' | 'system' | 'auto-trading';

const TABS: { key: Tab; label: string; available: boolean }[] = [
  { key: 'auth', label: 'Authentication Logs', available: true },
  { key: 'admin', label: 'Admin Actions', available: true },
  { key: 'api', label: 'API Errors', available: false },
  { key: 'broker', label: 'Broker Errors', available: false },
  { key: 'system', label: 'System Errors', available: false },
  { key: 'auto-trading', label: 'Auto Trading Logs', available: false },
];

function AuthLogsTable() {
  const [items, setItems] = useState<LoginLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    adminService.listLoginLogs(page, PAGE_SIZE)
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((err) => setError(err.message ?? 'Failed to load authentication logs'));
  }, [page]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-ink-600/30 bg-ink-800/50">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-center">Result</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">IP Address</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={5} className="py-16 text-center text-sm text-loss">{error}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-sm text-ink-300">No login attempts recorded yet.</td></tr>
            ) : items.map((l) => (
              <tr key={l.id} className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors">
                <td className="px-4 py-3 text-xs text-ink-200 whitespace-nowrap">{formatDate(l.createdAt)} {formatTime(l.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-ink-50">{l.email}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={l.success ? 'gain' : 'loss'}>{l.success ? 'Success' : 'Failed'}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-ink-300 hidden md:table-cell">{l.ipAddress ?? '—'}</td>
                <td className="px-4 py-3 text-2xs text-ink-400 hidden lg:table-cell truncate max-w-[220px]">{l.userAgent ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </Card>
  );
}

function AdminActionsTable() {
  const [items, setItems] = useState<AdminLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    adminService.listAdminLogs(page, PAGE_SIZE)
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((err) => setError(err.message ?? 'Failed to load admin actions'));
  }, [page]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-ink-600/30 bg-ink-800/50">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Target</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={4} className="py-16 text-center text-sm text-loss">{error}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="py-16 text-center text-sm text-ink-300">No admin actions recorded yet.</td></tr>
            ) : items.map((l) => (
              <tr key={l.id} className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors">
                <td className="px-4 py-3 text-xs text-ink-200 whitespace-nowrap">{formatDate(l.createdAt)} {formatTime(l.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-ink-50">{l.adminName}</td>
                <td className="px-4 py-3 text-xs font-mono text-brand-300">{l.action}</td>
                <td className="px-4 py-3 text-xs text-ink-300 hidden md:table-cell truncate max-w-[220px]">{l.target ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </Card>
  );
}

export default function AdminLogs() {
  const [tab, setTab] = useState<Tab>('auth');

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <AdminPageHeader icon={ScrollText} title="Logs" subtitle="Authentication and Admin Action logs are real; error logs need Phase 2" />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              tab === t.key
                ? 'bg-brand-400/20 text-brand-300 border-brand-400/40'
                : 'border-ink-600/60 text-ink-300 hover:text-ink-100 hover:border-ink-500',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'auth' && <AuthLogsTable />}
      {tab === 'admin' && <AdminActionsTable />}
      {tab === 'api' && <AdminComingSoon icon={ScrollText} title="API Errors" reason="No structured error-logging table exists yet — only ephemeral console.log statements visible in Railway's own logs." />}
      {tab === 'broker' && <AdminComingSoon icon={ScrollText} title="Broker Errors" reason="No structured error-logging table exists yet — only ephemeral console.log statements visible in Railway's own logs." />}
      {tab === 'system' && <AdminComingSoon icon={ScrollText} title="System Errors" reason="No structured error-logging table exists yet — only ephemeral console.log statements visible in Railway's own logs." />}
      {tab === 'auto-trading' && <AdminComingSoon icon={ScrollText} title="Auto Trading Logs" reason="Auto Trading diagnostics currently only relay to server console output, not a persisted table." />}
    </div>
  );
}
