import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, UserCheck, UserPlus, ShieldCheck,
  TrendingUp, Activity, Plug, PlugZap, IndianRupee,
} from 'lucide-react';
import { StatCard } from '@components/dashboard/StatCard';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { adminService } from '@services/admin.service';
import { formatINR } from '@utils/format';
import type { AdminDashboardStats } from '@/types';

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
        subtitle="Real account, trading, and revenue data"
      />

      {error ? (
        <p className="text-sm text-loss">{error}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard label="Total Registered Users" value={stats ? String(stats.totalUsers) : '—'} icon={Users} accent="brand" delay={0} />
            <StatCard label="New Signups Today" value={stats ? String(stats.newSignupsToday) : '—'} icon={UserPlus} accent="gain" delay={0.05} />
            <StatCard label="KYC Verified Users" value={stats ? String(stats.kycVerifiedUsers) : '—'} icon={UserCheck} accent="brand" delay={0.1} />
            <StatCard label="Admin Actions Today" value={stats ? String(stats.adminActionsToday) : '—'} icon={ShieldCheck} accent="neutral" delay={0.15} />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <StatCard label="Users Traded Today" value={stats ? String(stats.usersTradedToday) : '—'} icon={Activity} accent="brand" delay={0.2} />
            <StatCard label="Total Trades Today" value={stats ? String(stats.totalTradesToday) : '—'} icon={TrendingUp} accent="brand" delay={0.25} />
            <StatCard label="Broker Connected" value={stats ? String(stats.brokerConnectedUsers) : '—'} icon={PlugZap} accent="gain" delay={0.3} />
            <StatCard label="Broker Disconnected" value={stats ? String(stats.brokerDisconnectedUsers) : '—'} icon={Plug} accent="neutral" delay={0.35} />
            <StatCard label="Total Revenue" value={stats ? formatINR(stats.totalRevenue) : '—'} icon={IndianRupee} accent="gain" delay={0.4} />
          </section>
        </>
      )}
    </div>
  );
}
