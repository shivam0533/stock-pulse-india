import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { Card, Badge, Avatar } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { adminService } from '@services/admin.service';
import { formatDate } from '@utils/format';
import type { AdminUserSummary } from '@/types';

const PHASE_2_FIELDS = [
  'Current Margin', 'Available Margin', "Today's P&L", 'Overall P&L', "Today's Trades",
  'Trade History', 'Open Positions', 'Risk Settings', 'Auto Trading Status',
  'Login History', 'Recent Activity', 'Device Information', 'IP Address',
];

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    adminService.getUser(id).then(setUser).catch((err) => setError(err.message ?? 'User not found'));
  }, [id]);

  return (
    <div className="space-y-5 max-w-[1000px] mx-auto">
      <button
        type="button"
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-1.5 text-xs text-ink-300 hover:text-ink-50 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Users
      </button>

      <AdminPageHeader icon={UserIcon} title={user?.name ?? 'User Details'} subtitle={user?.email} />

      {error ? (
        <p className="text-sm text-loss">{error}</p>
      ) : !user ? (
        <p className="text-sm text-ink-300">Loading…</p>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-lg font-semibold text-ink-50">{user.name}</h2>
                  <Badge variant={user.role === 'admin' ? 'amber' : 'default'}>{user.role}</Badge>
                  <Badge variant={user.kycStatus === 'verified' ? 'gain' : user.kycStatus === 'rejected' ? 'loss' : 'neutral'}>
                    KYC: {user.kycStatus}
                  </Badge>
                </div>
                <p className="text-sm text-ink-300 mt-1">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-ink-600/30">
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">Phone</div>
                <div className="text-sm text-ink-50 mt-1">{user.phone ?? '—'}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">Client ID</div>
                <div className="font-mono text-xs text-ink-200 mt-1 truncate" title={user.id}>{user.id}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">Account Created</div>
                <div className="text-sm text-ink-50 mt-1">{formatDate(user.joinedAt)}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">PAN Verified</div>
                <div className="text-sm text-ink-50 mt-1">{user.panVerified ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold text-ink-50 mb-1">Coming soon (Phase 2)</h3>
            <p className="text-xs text-ink-300 mb-3">
              Needs a per-user trades table and per-user broker sessions — not shown as fake data.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {PHASE_2_FIELDS.map((label) => (
                <div key={label} className="bg-ink-700/30 border border-ink-600/40 rounded-xl px-3 py-2.5 text-xs text-ink-300">
                  {label}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
