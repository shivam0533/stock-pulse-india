import { useEffect, useRef, useState } from 'react';
import { CreditCard, Image as ImageIcon, Check, X, Clock3, RotateCw } from 'lucide-react';
import { Card, Badge, Button, Modal } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminPagination } from '@components/admin/AdminPagination';
import { adminSubscriptionService } from '@services/adminSubscription.service';
import { formatDate } from '@utils/format';
import type {
  AdminPaymentRequestEntry, PaymentRequestDetail, PaymentRequestStatus, SubscriptionStatus, SubscriptionUserSummary,
} from '@/types';

const PAGE_SIZE = 20;

const REQUEST_TABS: { label: string; value: PaymentRequestStatus }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const SUBSCRIBER_TABS: { label: string; value: SubscriptionStatus }[] = [
  { label: 'Trial', value: 'TRIAL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_BADGE: Record<PaymentRequestStatus | SubscriptionStatus, 'gain' | 'loss' | 'amber' | 'default'> = {
  PENDING: 'amber',
  APPROVED: 'gain',
  REJECTED: 'loss',
  TRIAL: 'amber',
  ACTIVE: 'gain',
  EXPIRED: 'loss',
  CANCELLED: 'default',
};

function PaymentRequestsPanel() {
  const [tab, setTab] = useState<PaymentRequestStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminPaymentRequestEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [screenshotDetail, setScreenshotDetail] = useState<PaymentRequestDetail | null>(null);
  // Guards against an earlier, slower tab/page's response overwriting a
  // later, faster one's (e.g. clicking Pending -> Approved before the first
  // request resolves) — same pattern as Users.tsx's requestTokenRef.
  const requestTokenRef = useRef(0);

  const load = () => {
    setLoading(true);
    const token = ++requestTokenRef.current;
    adminSubscriptionService.listPaymentRequests(tab, page, PAGE_SIZE)
      .then((res) => {
        if (requestTokenRef.current !== token) return;
        setItems(res.items); setTotal(res.total);
      })
      .finally(() => {
        if (requestTokenRef.current === token) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [tab, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await adminSubscriptionService.approvePaymentRequest(id);
      load();
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    setActingId(rejectTargetId);
    try {
      await adminSubscriptionService.rejectPaymentRequest(rejectTargetId, rejectReason.trim() || undefined);
      setRejectTargetId(null);
      setRejectReason('');
      load();
    } finally {
      setActingId(null);
    }
  };

  const viewScreenshot = async (id: string) => {
    const detail = await adminSubscriptionService.getPaymentRequestDetail(id);
    setScreenshotDetail(detail);
  };

  return (
    <>
      <div className="flex gap-1.5 mb-3">
        {REQUEST_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              tab === t.value ? 'bg-brand-400/20 text-brand-300 border-brand-400/40' : 'border-ink-600 text-ink-300 hover:text-ink-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-ink-600/30 bg-ink-800/50">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">UTR</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Screenshot</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-center">Status</th>
                {tab === 'PENDING' && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-ink-300">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-ink-300">No {tab.toLowerCase()} requests.</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-b border-ink-600/20 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="text-sm text-ink-50">{r.userName}</div>
                      <div className="text-2xs text-ink-400">{r.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-ink-200">{r.utr}</td>
                    <td className="px-4 py-3 text-right text-sm text-ink-50 tabular-nums">₹{r.amountInr.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      {r.hasScreenshot ? (
                        <button type="button" onClick={() => viewScreenshot(r.id)} className="text-ink-300 hover:text-brand-300 transition-colors">
                          <ImageIcon size={16} className="inline" />
                        </button>
                      ) : (
                        <span className="text-ink-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-300 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge></td>
                    {tab === 'PENDING' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" loading={actingId === r.id} leftIcon={<Check size={13} />} onClick={() => handleApprove(r.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" leftIcon={<X size={13} />} onClick={() => { setRejectTargetId(r.id); setRejectReason(''); }}>
                            Reject
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </Card>

      <Modal open={!!screenshotDetail} onClose={() => setScreenshotDetail(null)} title="Payment screenshot" size="md">
        {screenshotDetail?.screenshot ? (
          <img src={screenshotDetail.screenshot} alt="Payment screenshot" className="w-full rounded-lg" />
        ) : (
          <p className="text-sm text-ink-300">No screenshot attached.</p>
        )}
      </Modal>

      <Modal open={!!rejectTargetId} onClose={() => setRejectTargetId(null)} title="Reject payment request" size="sm">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-ink-200 uppercase tracking-wide">Reason (optional)</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full bg-ink-800 border border-ink-600 rounded-xl p-3 text-sm text-ink-50 outline-none focus:border-brand-400 transition-colors resize-none"
            placeholder="e.g. UTR does not match any received payment"
          />
          <Button variant="danger" fullWidth loading={actingId === rejectTargetId} onClick={handleReject}>
            Confirm Reject
          </Button>
        </div>
      </Modal>
    </>
  );
}

function SubscribersPanel() {
  const [tab, setTab] = useState<SubscriptionStatus>('TRIAL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SubscriptionUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [extendTargetId, setExtendTargetId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const requestTokenRef = useRef(0);

  const load = () => {
    setLoading(true);
    const token = ++requestTokenRef.current;
    adminSubscriptionService.listUsersByBucket(tab, page, PAGE_SIZE)
      .then((res) => {
        if (requestTokenRef.current !== token) return;
        setItems(res.items); setTotal(res.total);
      })
      .finally(() => {
        if (requestTokenRef.current === token) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [tab, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActivate = async (id: string) => {
    setActingId(id);
    try {
      await adminSubscriptionService.activateSubscription(id, 30);
      load();
    } finally {
      setActingId(null);
    }
  };

  const handleExtend = async () => {
    if (!extendTargetId) return;
    const days = Number(extendDays);
    if (!Number.isFinite(days) || days <= 0) return;
    setActingId(extendTargetId);
    try {
      await adminSubscriptionService.extendSubscription(extendTargetId, days);
      setExtendTargetId(null);
      load();
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActingId(id);
    try {
      await adminSubscriptionService.cancelSubscription(id);
      load();
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <div className="flex gap-1.5 mb-3">
        {SUBSCRIBER_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              tab === t.value ? 'bg-brand-400/20 text-brand-300 border-brand-400/40' : 'border-ink-600 text-ink-300 hover:text-ink-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-ink-600/30 bg-ink-800/50">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Trial ends</th>
                <th className="px-4 py-3 text-left">Subscription ends</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-ink-300">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-ink-300">No users in this bucket.</td></tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="border-b border-ink-600/20 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="text-sm text-ink-50">{u.name}</div>
                      <div className="text-2xs text-ink-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center"><Badge variant={STATUS_BADGE[u.subscriptionStatus]}>{u.subscriptionStatus}</Badge></td>
                    <td className="px-4 py-3 text-xs text-ink-300 whitespace-nowrap">{u.trialEndDate ? formatDate(u.trialEndDate) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-300 whitespace-nowrap">{u.subscriptionEndDate ? formatDate(u.subscriptionEndDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" loading={actingId === u.id} onClick={() => handleActivate(u.id)}>
                          Activate
                        </Button>
                        <Button size="sm" variant="outline" leftIcon={<RotateCw size={13} />} onClick={() => { setExtendTargetId(u.id); setExtendDays('30'); }}>
                          Extend
                        </Button>
                        {u.subscriptionStatus !== 'CANCELLED' && (
                          <Button size="sm" variant="danger" loading={actingId === u.id} onClick={() => handleCancel(u.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </Card>

      <Modal open={!!extendTargetId} onClose={() => setExtendTargetId(null)} title="Extend subscription" size="sm">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-ink-200 uppercase tracking-wide">Days to add</label>
          <input
            type="number"
            min={1}
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            className="w-full bg-ink-800 border border-ink-600 rounded-xl h-11 px-3.5 text-sm text-ink-50 outline-none focus:border-brand-400 transition-colors"
          />
          <Button fullWidth loading={actingId === extendTargetId} onClick={handleExtend}>
            Confirm Extend
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function AdminSubscriptions() {
  const [view, setView] = useState<'requests' | 'subscribers'>('requests');

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto">
      <AdminPageHeader icon={CreditCard} title="Subscriptions" subtitle="Trial & payment review — approve, reject, activate, extend, or cancel." />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('requests')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
            view === 'requests' ? 'bg-ink-700 text-ink-50 border-ink-500' : 'border-ink-600/60 text-ink-300 hover:text-ink-50'
          }`}
        >
          <Clock3 size={14} /> Payment Requests
        </button>
        <button
          type="button"
          onClick={() => setView('subscribers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
            view === 'subscribers' ? 'bg-ink-700 text-ink-50 border-ink-500' : 'border-ink-600/60 text-ink-300 hover:text-ink-50'
          }`}
        >
          <CreditCard size={14} /> Subscribers
        </button>
      </div>

      {view === 'requests' ? <PaymentRequestsPanel /> : <SubscribersPanel />}
    </div>
  );
}
