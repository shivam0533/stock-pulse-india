import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, CreditCard, Info, KeyRound, Lock, LogOut, Plug, Smartphone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@components/ui';
import { PasswordInput } from '@components/auth/PasswordInput';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerToastStore } from '@store/brokerToast.store';
import {
  connectKotakNeo,
  disconnectKotakNeo,
  testKotakNeoConnection,
  type KotakNeoCredentials,
} from '@services/broker/kotakNeoAuth.service';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';

type FormState = KotakNeoCredentials;
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  consumerKey: '',
  consumerSecret: '',
  mobileNumber: '',
  ucc: '',
  totp: '',
  mpin: '',
};

const REQUIRED_FIELDS: (keyof FormState)[] = ['consumerKey', 'consumerSecret', 'mobileNumber', 'ucc', 'totp', 'mpin'];

const API_FEATURES = [
  'Live Trading', 'Order Placement', 'Position Sync', 'Holdings Sync', 'Order Book', 'Funds', 'Portfolio',
];

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono text-sm font-semibold text-ink-50 truncate">{value}</div>
    </div>
  );
}

function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(ms));
}

/**
 * Kotak Neo connection form. connectKotakNeo/disconnectKotakNeo/
 * testKotakNeoConnection (kotakNeoAuth.service.ts) call the real backend
 * (backend/services/kotakNeoService.ts), which authenticates against the
 * official Kotak Neo Trade API (view token -> trade token, verified from
 * the official SDK source — no unofficial SDK, no mock data). A successful
 * connect writes into the same, existing useBrokerConnectionStore Angel One
 * already uses, so the Broker Integration card picks up "Connected"
 * automatically, and the existing useBrokerSessionMonitor (mounted
 * app-wide) enforces this session's expiry the same way it does for every
 * other broker — nothing there needed to change.
 */
export default function KotakNeoIntegration() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connection = useBrokerConnectionStore((s) => s.connections.KOTAK_NEO);
  const setConnected = useBrokerConnectionStore((s) => s.setConnected);
  const setDisconnected = useBrokerConnectionStore((s) => s.setDisconnected);
  const pushToast = useBrokerToastStore((s) => s.push);

  const isConnected = !!connection;

  const patch = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const handleConnect = async () => {
    const nextErrors: FormErrors = {};
    for (const key of REQUIRED_FIELDS) if (!form[key]?.trim()) nextErrors[key] = 'Required';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setConnecting(true);
    try {
      const session = await connectKotakNeo(form);
      setConnected('KOTAK_NEO', {
        clientName: session.userName || 'Kotak Neo User',
        clientCode: session.clientId,
        brokerName: 'Kotak Neo',
        connectedAt: session.loginTime,
        sessionExpiresAt: session.sessionExpiresAt,
        jwtToken: '',
        refreshToken: '',
        feedToken: '',
      });
      setForm(EMPTY_FORM);
      pushToast('success', 'Kotak Neo connected.');
      navigate(ROUTES.BROKER_INTEGRATION);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to connect Kotak Neo.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testKotakNeoConnection();
      pushToast(result.success ? 'success' : 'error', result.message);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectKotakNeo();
    } finally {
      setDisconnected('KOTAK_NEO');
      pushToast('success', 'Disconnected from Kotak Neo.');
      setDisconnecting(false);
    }
  };

  const sessionStatus = connection && connection.sessionExpiresAt > Date.now() ? 'Active' : 'Expired';

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2">
          <Plug size={22} className="text-brand-300" />
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            Kotak Neo Integration
          </h1>
        </div>
        <p className="mt-1 text-sm text-ink-200">
          Connect your Kotak Neo account to enable Live Trading.
        </p>
      </motion.div>

      {/* Broker Credentials */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-brand-300" />
              <CardTitle>Broker Credentials</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Consumer Key (API Key)"
              placeholder="Enter Consumer Key"
              leftIcon={<KeyRound size={15} />}
              value={form.consumerKey}
              onChange={(e) => patch('consumerKey', e.target.value)}
              error={errors.consumerKey}
              disabled={connecting || isConnected}
              autoComplete="off"
            />
            <PasswordInput
              label="Consumer Secret"
              placeholder="Enter Consumer Secret"
              value={form.consumerSecret}
              onChange={(e) => patch('consumerSecret', e.target.value)}
              error={errors.consumerSecret}
              disabled={connecting || isConnected}
              autoComplete="off"
            />
            <Input
              label="Mobile Number"
              placeholder="10-digit mobile number"
              leftIcon={<Smartphone size={15} />}
              value={form.mobileNumber}
              onChange={(e) => patch('mobileNumber', e.target.value)}
              error={errors.mobileNumber}
              disabled={connecting || isConnected}
              autoComplete="off"
            />
            <Input
              label="UCC (Client Code)"
              placeholder="e.g. ABC12"
              leftIcon={<CreditCard size={15} />}
              value={form.ucc}
              onChange={(e) => patch('ucc', e.target.value)}
              error={errors.ucc}
              disabled={connecting || isConnected}
              autoComplete="off"
            />
            <PasswordInput
              label="TOTP"
              placeholder="6-digit authenticator app code"
              hint="From Google/Microsoft Authenticator — not an SMS OTP"
              value={form.totp}
              onChange={(e) => patch('totp', e.target.value)}
              error={errors.totp}
              disabled={connecting || isConnected}
              autoComplete="off"
            />
            <PasswordInput
              label="MPIN"
              placeholder="Enter MPIN"
              value={form.mpin}
              onChange={(e) => patch('mpin', e.target.value)}
              error={errors.mpin}
              disabled={connecting || isConnected}
              autoComplete="off"
            />

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="sm" onClick={handleConnect} loading={connecting} disabled={isConnected || disconnecting}>
                Connect Broker
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTest}
                loading={testing}
                disabled={connecting || disconnecting}
              >
                Test Connection
              </Button>
              {isConnected && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                  disabled={connecting || testing}
                  leftIcon={<LogOut size={14} />}
                >
                  Disconnect Broker
                </Button>
              )}
            </div>

            {/* Connection Status */}
            <div className="pt-3 border-t border-ink-600/30">
              <div className="text-2xs text-ink-300 uppercase tracking-wide mb-2">Connection Status</div>
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold',
                  isConnected
                    ? 'bg-gain-subtle text-gain border-gain-border'
                    : 'bg-loss-subtle text-loss border-loss-border',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-gain' : 'bg-loss')} />
                {isConnected ? 'Connected' : 'Not Connected'}
              </div>

              {isConnected && connection && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <InfoTile label="Broker" value="Kotak Neo" />
                  <InfoTile label="Client ID" value={connection.clientCode} />
                  <InfoTile label="Login Time" value={formatDateTime(connection.connectedAt)} />
                  <InfoTile label="Session Status" value={sessionStatus} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Notice */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <CardContent className="flex items-start gap-3">
            <Lock size={18} className="text-brand-300 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-200 leading-relaxed">
              Your credentials are encrypted and never stored in plain text.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* API Features */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info size={16} className="text-brand-300" />
              <CardTitle>Kotak Neo API Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {API_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-ink-200">
                  <CheckCircle2 size={14} className="text-gain shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
