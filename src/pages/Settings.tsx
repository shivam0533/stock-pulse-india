import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Bell, CheckCircle2, ChevronRight, Globe,
  KeyRound, Laptop, LogOut, Monitor, Settings as SettingsIcon,
  Shield, Smartphone, Trash2, User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Modal } from '@components/ui';
import { PasswordInput } from '@components/auth/PasswordInput';
import { PasswordStrengthBar } from '@components/auth/PasswordStrengthBar';
import { useAuthStore } from '@store/auth.store';
import { useVoiceNotificationStore } from '@store/voiceNotification.store';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';

// ── Generic toggle row ────────────────────────────────────────────────────────
function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-5 border-b border-ink-600/30 last:border-b-0">
      <div>
        <div className="text-sm text-ink-100">{label}</div>
        {description && <div className="text-xs text-ink-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none',
          checked ? 'bg-brand-400' : 'bg-ink-600',
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-1',
          checked ? 'translate-x-6' : 'translate-x-1',
        )} />
      </button>
    </div>
  );
}

// ── Select row ────────────────────────────────────────────────────────────────
function SelectRow<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-5 border-b border-ink-600/30 last:border-b-0">
      <span className="text-sm text-ink-100">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-ink-800 border border-ink-600 rounded-xl text-xs text-ink-100 px-2.5 py-1.5 outline-none hover:border-ink-500 transition-colors"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <Card>
      <div className="px-5 py-4 border-b border-ink-600/40 flex items-center gap-2">
        <Icon size={16} className="text-brand-300" />
        <h3 className="font-display text-base font-semibold text-ink-50">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

// ── Saved toast ───────────────────────────────────────────────────────────────
function SavedToast() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gain-subtle border border-gain/30 text-xs text-gain"
    >
      <CheckCircle2 size={13} />
      Saved
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, changePassword, error, clearError } = useAuthStore();
  const { enabled: voiceEnabled, setEnabled: setVoiceEnabled } = useVoiceNotificationStore();

  // Notifications
  const [notifs, setNotifs] = useState({
    priceAlerts:       user?.preferences.notifications.priceAlerts       ?? true,
    portfolioUpdates:  user?.preferences.notifications.portfolioUpdates  ?? true,
    marketNews:        user?.preferences.notifications.marketNews        ?? false,
    emailDigest:       true,
    pushNotifications: false,
  });

  // Display
  const [display, setDisplay] = useState({
    showInLakhs:  user?.preferences.display.showInLakhs ?? true,
    compactView:  user?.preferences.display.compactView ?? false,
    exchange:     user?.preferences.defaultExchange ?? 'NSE' as 'NSE' | 'BSE',
    theme:        'dark' as 'dark' | 'light' | 'system',
  });

  // Security — change password
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState<string | null>(null);
  const [pwSaved, setPwSaved]     = useState(false);
  const pwMismatch = pwForm.confirm.length > 0 && pwForm.newPw !== pwForm.confirm;

  // 2FA mock toggle
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  // Session
  const MOCK_SESSIONS = [
    { id: 's1', device: 'Chrome · Windows 11', location: 'Mumbai, IN', current: true,  lastSeen: Date.now() - 60000 },
    { id: 's2', device: 'Safari · iPhone 15',  location: 'Mumbai, IN', current: false, lastSeen: Date.now() - 3600000 * 2 },
  ];

  // Delete account modal
  const [showDelete, setShowDelete] = useState(false);

  // Saved indicators
  const [notifSaved, setNotifSaved]     = useState(false);
  const [displaySaved, setDisplaySaved] = useState(false);

  const handleSaveNotifs = async () => {
    clearError();
    await updateProfile({
      preferences: { notifications: { priceAlerts: notifs.priceAlerts, portfolioUpdates: notifs.portfolioUpdates, marketNews: notifs.marketNews } },
    }).catch(() => {});
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const handleSaveDisplay = async () => {
    clearError();
    await updateProfile({
      preferences: { defaultExchange: display.exchange, display: { showInLakhs: display.showInLakhs, compactView: display.compactView } },
    }).catch(() => {});
    setDisplaySaved(true);
    setTimeout(() => setDisplaySaved(false), 2500);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwMismatch) return;
    setPwError(null);
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwSaved(true);
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError((err as { message?: string }).message ?? 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
            <SettingsIcon size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">Settings</h1>
            <p className="text-sm text-ink-200 mt-0.5">Manage your account preferences and security.</p>
          </div>
        </div>
      </motion.div>

      {/* Account snapshot */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-ink-50 truncate">{user.name}</div>
              <div className="text-xs text-ink-300 truncate">{user.email}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant={user.kycStatus === 'verified' ? 'gain' : 'amber'}>
                <Shield size={10} /> KYC {user.kycStatus}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.PROFILE)}
              className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
            >
              Edit profile <ChevronRight size={12} />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Section title="Notifications" icon={Bell}>
          <ToggleRow label="Price Alerts" description="Notify when watched stocks hit your target price" checked={notifs.priceAlerts} onChange={(v) => setNotifs((s) => ({ ...s, priceAlerts: v }))} />
          <ToggleRow label="Portfolio Updates" description="Daily summary of your portfolio performance" checked={notifs.portfolioUpdates} onChange={(v) => setNotifs((s) => ({ ...s, portfolioUpdates: v }))} />
          <ToggleRow label="Market News" description="Breaking market news and corporate actions" checked={notifs.marketNews} onChange={(v) => setNotifs((s) => ({ ...s, marketNews: v }))} />
          <ToggleRow label="Email Digest" description="Weekly performance digest to your email" checked={notifs.emailDigest} onChange={(v) => setNotifs((s) => ({ ...s, emailDigest: v }))} />
          <ToggleRow label="Push Notifications" description="Browser push notifications when market opens" checked={notifs.pushNotifications} onChange={(v) => setNotifs((s) => ({ ...s, pushNotifications: v }))} />
          <ToggleRow label="Voice Notifications" description="Speak Option Chain trade events out loud (BUY, Target, Stop Loss, and exits)" checked={voiceEnabled} onChange={setVoiceEnabled} />
          <div className="px-5 py-3 flex justify-end">
            <div className="flex items-center gap-3">
              {notifSaved && <SavedToast />}
              <Button size="sm" variant="secondary" onClick={handleSaveNotifs}>Save preferences</Button>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Display */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <Section title="Display" icon={Monitor}>
          <ToggleRow label="Show values in Lakhs/Crores" description="Format large numbers in Indian style (₹1.2L)" checked={display.showInLakhs} onChange={(v) => setDisplay((s) => ({ ...s, showInLakhs: v }))} />
          <ToggleRow label="Compact view" description="Reduce spacing in tables and lists" checked={display.compactView} onChange={(v) => setDisplay((s) => ({ ...s, compactView: v }))} />
          <SelectRow
            label="Default exchange"
            value={display.exchange}
            options={[{ label: 'NSE', value: 'NSE' }, { label: 'BSE', value: 'BSE' }]}
            onChange={(v) => setDisplay((s) => ({ ...s, exchange: v }))}
          />
          <SelectRow
            label="Theme"
            value={display.theme}
            options={[{ label: '🌙 Dark', value: 'dark' }, { label: '☀️ Light', value: 'light' }, { label: '💻 System', value: 'system' }]}
            onChange={(v) => setDisplay((s) => ({ ...s, theme: v }))}
          />
          <div className="px-5 py-3 flex justify-end">
            <div className="flex items-center gap-3">
              {displaySaved && <SavedToast />}
              <Button size="sm" variant="secondary" onClick={handleSaveDisplay}>Save display</Button>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Section title="Security" icon={Shield}>
          {/* Change password */}
          <div className="px-5 py-4 border-b border-ink-600/30">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={15} className="text-ink-300" />
              <span className="text-sm font-medium text-ink-100">Change Password</span>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <PasswordInput
                label="Current password"
                value={pwForm.current}
                onChange={(e) => setPwForm((s) => ({ ...s, current: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <div className="space-y-1.5">
                <PasswordInput
                  label="New password"
                  value={pwForm.newPw}
                  onChange={(e) => setPwForm((s) => ({ ...s, newPw: e.target.value }))}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                {pwForm.newPw && <PasswordStrengthBar password={pwForm.newPw} />}
              </div>
              <PasswordInput
                label="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((s) => ({ ...s, confirm: e.target.value }))}
                placeholder="Repeat new password"
                autoComplete="new-password"
                error={pwMismatch ? 'Passwords do not match' : undefined}
              />
              {(pwError || error) && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>{pwError ?? error}</span>
                </div>
              )}
              {pwSaved && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gain-subtle border border-gain/30 text-xs text-gain">
                  <CheckCircle2 size={13} />
                  Password changed successfully.
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  loading={pwLoading}
                  disabled={!pwForm.current || !pwForm.newPw || !pwForm.confirm || pwMismatch}
                >
                  Update password
                </Button>
              </div>
            </form>
          </div>

          {/* 2FA */}
          <ToggleRow
            label="Two-Factor Authentication (2FA)"
            description="Add an extra layer of security with TOTP authenticator"
            checked={twoFAEnabled}
            onChange={setTwoFAEnabled}
          />
          {twoFAEnabled && (
            <div className="px-5 py-3 bg-brand-400/5 border-b border-ink-600/30">
              <p className="text-xs text-ink-300">
                2FA setup would open an authenticator QR code flow. (Mock — not functional in demo.)
              </p>
            </div>
          )}
        </Section>
      </motion.div>

      {/* Sessions */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
        <Section title="Active Sessions" icon={Laptop}>
          {MOCK_SESSIONS.map((s) => (
            <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 border-b border-ink-600/30 last:border-b-0">
              <div className="h-9 w-9 rounded-xl bg-ink-700/60 border border-ink-600 flex items-center justify-center shrink-0">
                {s.device.includes('iPhone') ? <Smartphone size={16} className="text-ink-300" /> : <Globe size={16} className="text-ink-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-50 flex items-center gap-2">
                  {s.device}
                  {s.current && <Badge variant="gain" className="text-2xs">Current</Badge>}
                </div>
                <div className="text-xs text-ink-400">
                  {s.location} · {s.current ? 'Active now' : `Last seen ${new Date(s.lastSeen).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                </div>
              </div>
              {!s.current && (
                <button type="button" className="text-xs text-loss hover:text-loss/80 transition-colors">Revoke</button>
              )}
            </div>
          ))}
          <div className="px-5 py-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={handleLogout} leftIcon={<LogOut size={13} />}>
              Sign out all devices
            </Button>
          </div>
        </Section>
      </motion.div>

      {/* Account info */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Section title="Account" icon={User}>
          <div className="px-5 py-3.5 flex justify-between border-b border-ink-600/30">
            <span className="text-sm text-ink-300">Member since</span>
            <span className="text-sm text-ink-100">{formatDate(user.joinedAt)}</span>
          </div>
          <div className="px-5 py-3.5 flex justify-between">
            <span className="text-sm text-ink-300">Account ID</span>
            <span className="text-sm font-mono text-ink-100">{user.id}</span>
          </div>
        </Section>
      </motion.div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <Card className="border-loss/30">
          <div className="px-5 py-4 border-b border-loss/20 flex items-center gap-2">
            <AlertTriangle size={16} className="text-loss" />
            <h3 className="font-display text-base font-semibold text-loss">Danger Zone</h3>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-ink-50">Delete account</div>
              <div className="text-xs text-ink-400 mt-0.5">
                Permanently remove your account and all data. This cannot be undone.
              </div>
            </div>
            <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setShowDelete(true)}>
              Delete account
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Delete confirmation modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-loss-subtle border border-loss/30 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-loss" />
            </div>
            <div>
              <p className="text-sm text-ink-50 font-medium">Are you absolutely sure?</p>
              <p className="mt-1 text-xs text-ink-300">
                Your portfolio, watchlist, trade history, and all account data will be permanently deleted.
                There is no recovery option.
              </p>
            </div>
          </div>
          <div className="bg-loss-subtle border border-loss/30 rounded-xl px-3 py-2.5 text-xs text-loss">
            This action is irreversible and cannot be undone.
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowDelete(false)} fullWidth>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setShowDelete(false); handleLogout(); }}
              fullWidth
            >
              Delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
