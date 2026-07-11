import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, UserCheck, UserPlus, ShieldCheck } from 'lucide-react';
import { StatCard } from '@components/dashboard/StatCard';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { Card } from '@components/ui';
import { adminService } from '@services/admin.service';
import type { AdminDashboardStats } from '@/types';

const COMING_SOON = [
  'Users Traded Today',
  'Total Trades Today',
  'Broker Connected Users',
  'Broker Disconnected Users',
  'Auto Trading Enabled Users',
  'Total Revenue',
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getDashboard().then(setStats).catch((err) => setError(err.message ?? 'Failed to load'));
  }, []);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Admin Dashboard"
        subtitle="Real account data — Phase 1 of the Admin Panel"
      />

      {error ? (
        <p className="text-sm text-loss">{error}</p>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="Total Registered Users" value={stats ? String(stats.totalUsers) : '—'} icon={Users} accent="brand" delay={0} />
          <StatCard label="New Signups Today" value={stats ? String(stats.newSignupsToday) : '—'} icon={UserPlus} accent="gain" delay={0.05} />
          <StatCard label="KYC Verified Users" value={stats ? String(stats.kycVerifiedUsers) : '—'} icon={UserCheck} accent="brand" delay={0.1} />
          <StatCard label="Admin Actions Today" value={stats ? String(stats.adminActionsToday) : '—'} icon={ShieldCheck} accent="neutral" delay={0.15} />
        </section>
      )}

      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-ink-50 mb-1">Coming soon (Phase 2)</h3>
        <p className="text-xs text-ink-300 mb-3">
          These need a per-user trade table and per-user broker sessions — a separate, larger change to the live
          trading engine. Not shown here as zeros/fake numbers.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {COMING_SOON.map((label) => (
            <div key={label} className="bg-ink-700/30 border border-ink-600/40 rounded-xl px-3 py-2.5 text-xs text-ink-300">
              {label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
