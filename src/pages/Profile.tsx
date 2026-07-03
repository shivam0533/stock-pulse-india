import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Camera, CheckCircle2, Mail, Pencil, Phone,
  Settings, Shield, X, type LucideIcon,
} from 'lucide-react';
import { Avatar, Badge, Button, Card } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import { formatDate } from '@utils/format';
import { ROUTES } from '@utils/constants';
import { Input } from '@components/ui';
import { cn } from '@utils/cn';

// ── Inline-editable field ─────────────────────────────────────────────────────
function EditableField({
  icon: Icon, label, value, onSave, type = 'text',
}: {
  icon: LucideIcon; label: string; value: string; type?: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  return (
    <div className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0">
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            leftIcon={<Icon size={14} />}
            className="flex-1 h-9 text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-lg bg-gain-subtle text-gain hover:bg-gain/20 transition-colors"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value); setEditing(false); }}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-50 hover:bg-ink-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-ink-700/60 border border-ink-600 flex items-center justify-center shrink-0">
            <Icon size={14} className="text-ink-200" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
            <div className={cn('text-sm truncate', saved ? 'text-gain' : 'text-ink-50')}>
              {value || <span className="text-ink-400 italic">Not provided</span>}
              {saved && <CheckCircle2 size={12} className="inline ml-1.5" />}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-50 hover:bg-ink-700 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── KYC Status steps ──────────────────────────────────────────────────────────
function KycStatus({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const steps = [
    { id: 'account', label: 'Account Created', done: true },
    { id: 'kyc',     label: 'KYC Submitted',   done: status !== 'pending' },
    { id: 'verify',  label: 'Verification',     done: status === 'verified' },
    { id: 'trade',   label: 'Ready to Trade',   done: status === 'verified' },
  ];

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2 flex-1">
          <div className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
            step.done
              ? 'bg-gain text-white'
              : status === 'rejected' && i === 2
                ? 'bg-loss text-white'
                : 'bg-ink-700 text-ink-400',
          )}>
            {step.done ? '✓' : i + 1}
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-2xs text-ink-300 truncate">{step.label}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-px mx-1', step.done ? 'bg-gain/50' : 'bg-ink-700')} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const [logoutLoading, setLogoutLoading] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLogoutLoading(true);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const saveName  = (name: string)  => updateProfile({ name });
  const savePhone = (phone: string) => updateProfile({ phone });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-ink-200">Manage your personal information.</p>
        </div>
        <Link to={ROUTES.SETTINGS}>
          <Button variant="secondary" size="sm" leftIcon={<Settings size={14} />}>
            Settings
          </Button>
        </Link>
      </motion.div>

      {/* Avatar + identity */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar name={user.name} size="lg" />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-brand-400 text-ink-950 flex items-center justify-center hover:bg-brand-300 transition-colors"
                title="Change avatar (demo — not functional)"
              >
                <Camera size={13} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-semibold text-ink-50 truncate">{user.name}</h2>
              <p className="text-sm text-ink-300 truncate">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={user.kycStatus === 'verified' ? 'gain' : 'amber'}>
                  <Shield size={10} /> KYC {user.kycStatus}
                </Badge>
                {user.panVerified && <Badge variant="gain">PAN Verified</Badge>}
                <Badge variant="default">NSE Member</Badge>
              </div>
            </div>
          </div>

          {/* KYC progress */}
          <div className="mt-5 pt-4 border-t border-ink-600/40">
            <div className="text-2xs text-ink-300 uppercase tracking-wide mb-3">Account Status</div>
            <KycStatus status={user.kycStatus} />
          </div>
        </Card>
      </motion.div>

      {/* Editable details */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <div className="px-5 py-4 border-b border-ink-600/40 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-50">Personal Details</h3>
            <span className="text-2xs text-ink-400">Hover a field to edit</span>
          </div>
          <div className="group">
            <EditableField icon={Mail}     label="Full Name" value={user.name}         onSave={saveName}  />
            <EditableField icon={Phone}    label="Phone"     value={user.phone ?? ''}  onSave={savePhone} type="tel" />
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-ink-600/30">
              <div className="h-8 w-8 rounded-lg bg-ink-700/60 border border-ink-600 flex items-center justify-center shrink-0">
                <Mail size={14} className="text-ink-200" />
              </div>
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">Email</div>
                <div className="text-sm text-ink-50">{user.email}</div>
                <div className="text-2xs text-ink-400">Email changes require identity verification.</div>
              </div>
            </div>
            <div className="px-5 py-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-ink-700/60 border border-ink-600 flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-ink-200" />
              </div>
              <div>
                <div className="text-2xs text-ink-300 uppercase tracking-wide">Member Since</div>
                <div className="text-sm text-ink-50">{formatDate(user.joinedAt)}</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card>
          <div className="px-5 py-4 border-b border-ink-600/40">
            <h3 className="font-display text-base font-semibold text-ink-50">Quick Access</h3>
          </div>
          {[
            { label: 'Notification preferences', sub: 'Alerts, portfolio updates, market news', to: ROUTES.SETTINGS },
            { label: 'Display & theme',           sub: 'Lakhs/crores, compact view, exchange',  to: ROUTES.SETTINGS },
            { label: 'Security & password',        sub: 'Change password, 2FA, sessions',        to: ROUTES.SETTINGS },
          ].map(({ label, sub, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ink-700/40 transition-colors border-b border-ink-600/30 last:border-b-0"
            >
              <div>
                <div className="text-sm text-ink-100">{label}</div>
                <div className="text-xs text-ink-400">{sub}</div>
              </div>
              <Settings size={15} className="text-ink-400 shrink-0" />
            </Link>
          ))}
        </Card>
      </motion.div>

      {/* Sign out */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-ink-50">Sign out</div>
              <p className="mt-1 text-xs text-ink-300">
                You'll need your credentials to sign back in.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={logoutLoading}
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
