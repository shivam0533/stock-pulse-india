import { useEffect, useState } from 'react';
import { CheckCircle2, Fingerprint, KeyRound, LogOut, ShieldCheck, User } from 'lucide-react';
import { Modal, Button, Input } from '@components/ui';
import { brokerApiClient, toBrokerApiError } from '@api/brokerApiClient';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerToastStore } from '@store/brokerToast.store';
import { angelOneSetupService, type AngelOneSetupInfo } from '@services/angelOneSetup.service';

interface AngelOneLoginModalProps {
  open: boolean;
  onClose: () => void;
}

interface AngelOneLoginForm {
  clientCode: string;
  pin: string;
  totp: string;
  apiKey: string;
}

type FormErrors = Partial<Record<keyof AngelOneLoginForm, string>>;

const EMPTY_FORM: AngelOneLoginForm = { clientCode: '', pin: '', totp: '', apiKey: '' };

interface AngelOneLoginResponseData {
  clientCode: string;
  name: string;
  broker: string;
  loginTime: string;
  expiresIn: number;
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono text-sm font-semibold text-ink-50">{value}</div>
    </div>
  );
}

function formatConnectedTime(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(ms));
}

/**
 * Angel One login UI — POST /api/broker/login routes through
 * brokerMockController to the real, shared AngelOneService instance (via
 * BrokerManagerService), which makes a genuine SmartAPI login call. ("Mock"
 * in that controller's name refers to the brokerId-less route shape, not a
 * fake implementation.) Successful logins are recorded in the global,
 * persisted brokerConnection store so the rest of the app can see Angel One
 * is "Connected" without re-deriving it here, and so the session survives a
 * page refresh. The session's expiry is enforced separately by
 * useBrokerSessionMonitor (mounted app-wide), which clears it automatically
 * once `sessionExpiresAt` passes.
 */
export function AngelOneLoginModal({ open, onClose }: AngelOneLoginModalProps) {
  const [form, setForm] = useState<AngelOneLoginForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connection = useBrokerConnectionStore((s) => s.connections.ANGEL_ONE);
  const setConnected = useBrokerConnectionStore((s) => s.setConnected);
  const setDisconnected = useBrokerConnectionStore((s) => s.setDisconnected);
  const pushToast = useBrokerToastStore((s) => s.push);

  const [setupInfo, setSetupInfo] = useState<AngelOneSetupInfo | null>(null);
  useEffect(() => {
    if (open) angelOneSetupService.getSetupInfo().then(setSetupInfo).catch(() => {});
  }, [open]);

  const patch = (key: keyof AngelOneLoginForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const handleClose = () => {
    if (loading || disconnecting) return;
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  const handleConnect = async () => {
    const nextErrors: FormErrors = {};
    if (!form.clientCode.trim()) nextErrors.clientCode = 'Client Code is required.';
    if (!form.pin.trim()) nextErrors.pin = 'PIN is required.';
    if (!form.totp.trim()) nextErrors.totp = 'TOTP is required.';
    if (!form.apiKey.trim()) nextErrors.apiKey = 'Your own SmartAPI App Key is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { data } = await brokerApiClient.post<{ success: boolean; data: AngelOneLoginResponseData }>(
        '/broker/login',
        form,
      );
      const session = data.data;
      const connectedAt = Date.parse(session.loginTime) || Date.now();
      setConnected('ANGEL_ONE', {
        clientName: session.name,
        clientCode: session.clientCode,
        brokerName: 'Angel One',
        connectedAt,
        sessionExpiresAt: connectedAt + session.expiresIn * 1000,
        jwtToken: session.jwtToken,
        refreshToken: session.refreshToken,
        feedToken: session.feedToken,
      });
      setForm(EMPTY_FORM);
      pushToast('success', 'Angel One connected.');
    } catch (err) {
      pushToast('error', toBrokerApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await brokerApiClient.post('/broker/logout');
    } catch {
      // Best-effort — the session is a local/mock construct, so it's cleared
      // client-side regardless of whether the mock logout call succeeds.
    } finally {
      setDisconnected('ANGEL_ONE');
      pushToast('success', 'Disconnected from Angel One.');
      setDisconnecting(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Connect Angel One" size="sm" hideClose={loading || disconnecting}>
      {connection ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-gain-subtle border border-gain-border text-sm font-semibold text-gain">
            <CheckCircle2 size={18} className="shrink-0" />
            Connected
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoTile label="Client Name" value={connection.clientName} />
            <InfoTile label="Client Code" value={connection.clientCode} />
            <InfoTile label="Broker Name" value={connection.brokerName} />
            <InfoTile label="Connected Time" value={formatConnectedTime(connection.connectedAt)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={handleDisconnect}
              loading={disconnecting}
              disabled={loading}
              leftIcon={<LogOut size={14} />}
            >
              Disconnect
            </Button>
            <Button size="sm" fullWidth onClick={handleClose} disabled={disconnecting}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Client Code"
            placeholder="e.g. A123456"
            leftIcon={<User size={15} />}
            value={form.clientCode}
            onChange={(e) => patch('clientCode', e.target.value)}
            error={errors.clientCode}
            disabled={loading}
            autoComplete="off"
          />
          <Input
            label="PIN"
            type="password"
            placeholder="4-digit PIN"
            leftIcon={<KeyRound size={15} />}
            value={form.pin}
            onChange={(e) => patch('pin', e.target.value)}
            error={errors.pin}
            disabled={loading}
            autoComplete="off"
          />
          <Input
            label="TOTP"
            placeholder="6-digit authenticator code"
            leftIcon={<ShieldCheck size={15} />}
            value={form.totp}
            onChange={(e) => patch('totp', e.target.value)}
            error={errors.totp}
            disabled={loading}
            autoComplete="off"
          />
          <div>
            <Input
              label="SmartAPI App Key"
              placeholder="Your own Angel One SmartAPI app key"
              leftIcon={<Fingerprint size={15} />}
              value={form.apiKey}
              onChange={(e) => patch('apiKey', e.target.value)}
              error={errors.apiKey}
              disabled={loading}
              autoComplete="off"
            />
            <p className="mt-1.5 text-2xs text-ink-400 leading-snug">
              From your own app at{' '}
              <a href="https://smartapi.angelone.in" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
                smartapi.angelone.in
              </a>
              {setupInfo?.staticIp ? (
                <> — register Primary Static IP <code className="text-ink-200">{setupInfo.staticIp}</code> under that app first.</>
              ) : (
                ' — Angel One requires each account to use its own app key with a registered static IP.'
              )}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" size="sm" fullWidth onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" fullWidth onClick={handleConnect} loading={loading}>
              Connect
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
