import { useEffect, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { Card, Button, Input, Badge } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { adminService } from '@services/admin.service';
import { formatDate, formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AdminNotificationEntry, AdminNotificationType } from '@/types';

const TYPE_OPTIONS: { value: AdminNotificationType; label: string }[] = [
  { value: 'system', label: 'System Announcement' },
  { value: 'maintenance', label: 'Maintenance Notification' },
  { value: 'market-alert', label: 'Market Alert' },
  { value: 'popup', label: 'Popup Notification' },
];

const TYPE_BADGE: Record<AdminNotificationType, 'default' | 'amber' | 'gain' | 'loss'> = {
  system: 'default',
  maintenance: 'amber',
  'market-alert': 'gain',
  popup: 'loss',
};

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AdminNotificationType>('system');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AdminNotificationEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = () => {
    adminService.listNotifications(1, 20)
      .then((res) => { setHistory(res.items); setHistoryError(null); })
      .catch((err) => setHistoryError(err.message ?? 'Failed to load notification history'));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await adminService.sendNotification({ title, message, type, targetUserId: targetUserId.trim() || null });
      setTitle(''); setMessage(''); setTargetUserId('');
      setSent(true);
      setTimeout(() => setSent(false), 1800);
      loadHistory();
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[1000px] mx-auto">
      <AdminPageHeader icon={Bell} title="Notifications" subtitle="Send real, DB-backed notifications to users" />

      <Card className="p-5 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled Maintenance" />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ink-200 uppercase tracking-wide">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-ink-800 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-300 outline-none focus:border-brand-400 transition-colors"
            placeholder="Notification message shown to the user"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-200 uppercase tracking-wide">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdminNotificationType)}
              className="w-full bg-ink-800 border border-ink-600 rounded-xl h-11 px-3.5 text-sm text-ink-50 outline-none focus:border-brand-400 transition-colors"
            >
              {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <Input
            label="Target User ID (optional)"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Leave empty to send to all users"
          />
        </div>
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button onClick={handleSend} loading={sending} leftIcon={<Send size={15} />}>
          {sent ? 'Sent!' : targetUserId.trim() ? 'Send to User' : 'Send to All Users'}
        </Button>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-ink-600/40">
          <span className="font-display text-sm font-semibold text-ink-50">Sent History</span>
        </div>
        <div className="divide-y divide-ink-600/20 max-h-[420px] overflow-y-auto">
          {historyError ? (
            <p className="text-sm text-loss text-center py-10">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-ink-300 text-center py-10">No notifications sent yet.</p>
          ) : (
            history.map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-50 font-medium">{n.title}</span>
                    <Badge variant={TYPE_BADGE[n.type]}>{n.type}</Badge>
                    {!n.targetUserId && <Badge variant="neutral">All Users</Badge>}
                  </div>
                  <p className="text-xs text-ink-300 mt-1 truncate">{n.message}</p>
                </div>
                <span className={cn('text-2xs text-ink-400 shrink-0 whitespace-nowrap')}>
                  {formatDate(n.createdAt)} {formatTime(n.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
