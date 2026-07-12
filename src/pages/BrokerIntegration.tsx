import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Plug, Info, Stethoscope } from 'lucide-react';
import { Modal, Button } from '@components/ui';
import { BrokerCard } from '@components/broker/BrokerCard';
import { AngelOneLoginModal } from '@components/broker/AngelOneLoginModal';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useAuthStore } from '@store/auth.store';
import { brokerApiClient, toBrokerApiError } from '@api/brokerApiClient';
import { angelOneSetupService, type AngelOneSetupInfo } from '@services/angelOneSetup.service';
import { BROKERS } from '@config/brokers.config';
import { angelOneBrokerAdapter } from '@services/broker/angelOneBrokerAdapter';
import { zerodhaBrokerAdapter } from '@services/broker/zerodhaBrokerAdapter';
import { upstoxBrokerAdapter } from '@services/broker/upstoxBrokerAdapter';
import { shoonyaBrokerAdapter } from '@services/broker/shoonyaBrokerAdapter';
import { kotakNeoBrokerAdapter } from '@services/broker/kotakNeoBrokerAdapter';
import { ROUTES } from '@utils/constants';
import type { BrokerId } from '@services/broker/broker.types';

// Reuses each broker's own isAuthenticated() — the exact same check the
// Option Chain trading flow uses — so this page and trading stay in sync
// automatically once a real integration lands.
const ADAPTERS_BY_ID: Record<BrokerId, { isAuthenticated: () => boolean }> = {
  PAPER: { isAuthenticated: () => true },
  ANGEL_ONE: angelOneBrokerAdapter,
  ZERODHA: zerodhaBrokerAdapter,
  UPSTOX: upstoxBrokerAdapter,
  SHOONYA: shoonyaBrokerAdapter,
  KOTAK_NEO: kotakNeoBrokerAdapter,
};

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 bg-ink-800/60 border border-ink-600/60 rounded-lg px-3 py-1.5">
      <div>
        <div className="text-2xs text-ink-400 uppercase tracking-wide">{label}</div>
        <div className="font-mono text-xs text-ink-50">{value}</div>
      </div>
      <button type="button" onClick={handleCopy} className="text-ink-300 hover:text-brand-300 transition-colors shrink-0">
        {copied ? <span className="text-2xs text-gain">Copied</span> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function BrokerIntegration() {
  const navigate = useNavigate();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [angelOneModalOpen, setAngelOneModalOpen] = useState(false);
  const connections = useBrokerConnectionStore((s) => s.connections);
  const role = useAuthStore((s) => s.user?.role);

  // Angel One's 2026 SEBI-compliance update ties trading-data access to
  // whichever account registered the calling IP against its own SmartAPI
  // app — every user now needs their own app + this server's static IP
  // registered under it (see angelOne.service.ts). Hidden entirely until
  // that IP actually exists (Railway Static Outbound IPs enabled).
  const [angelOneSetup, setAngelOneSetup] = useState<AngelOneSetupInfo | null>(null);
  useEffect(() => {
    angelOneSetupService.getSetupInfo().then(setAngelOneSetup).catch(() => {});
  }, []);

  // Temporary — Angel One RMS/entitlement investigation. One-click version
  // of the diagnostic for anyone not comfortable with the browser console.
  // Safe to remove once the provisioning question is closed.
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const runEntitlementCheck = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagResult(null);
    try {
      const { data } = await brokerApiClient.get('/broker/ANGEL_ONE/diagnostics/entitlement-check');
      setDiagResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setDiagError(toBrokerApiError(err).message);
    } finally {
      setDiagLoading(false);
    }
  };

  const handleConnect = (brokerId: BrokerId) => {
    if (brokerId === 'ANGEL_ONE') setAngelOneModalOpen(true);
    else if (brokerId === 'KOTAK_NEO') navigate(ROUTES.KOTAK_NEO_INTEGRATION);
    else setComingSoonOpen(true);
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Plug size={22} className="text-brand-300" />
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            Broker Integration
          </h1>
        </div>
        <p className="mt-1 text-sm text-ink-200">
          Connect a broker to execute live orders. Paper Trading continues to work independently.
        </p>
      </motion.div>

      {/* Temporary diagnostic — Angel One RMS/entitlement investigation, SUPER_ADMIN only */}
      {role === 'super_admin' && connections.ANGEL_ONE && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-ink-600/60 bg-ink-800/60">
          <Stethoscope size={16} className="text-ink-300 shrink-0" />
          <span className="text-sm text-ink-200 flex-1">Angel One entitlement diagnostic (temporary, for the current investigation)</span>
          <Button size="sm" variant="secondary" loading={diagLoading} onClick={runEntitlementCheck}>
            Run Check
          </Button>
        </div>
      )}

      {/* Angel One static-IP setup — before connecting, each account must register this server's IP under its own SmartAPI app. Hidden until Railway's static IP actually exists, and once Angel One is already connected. */}
      {angelOneSetup?.staticIp && !connections.ANGEL_ONE && (
        <div className="flex flex-col gap-3 px-4 py-3.5 rounded-xl border border-amber-400/30 bg-amber-400/8">
          <p className="text-sm font-medium text-ink-50">Before connecting Angel One</p>
          <p className="text-xs text-ink-300 leading-relaxed">
            Angel One requires each account to register this server's IP under your own SmartAPI app
            (<a href="https://smartapi.angelone.in" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">smartapi.angelone.in</a> → Add App → Primary Static IP),
            then use that app's API Key when connecting below.
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyChip label="Primary Static IP" value={angelOneSetup.staticIp} />
            <CopyChip label="Redirect URL" value={angelOneSetup.redirectUrl} />
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-400/30 bg-brand-400/8 text-sm text-brand-300">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          {Object.values(connections).some(Boolean)
            ? 'A broker is connected. Turn off Paper Trading Only in Option Chain → Risk Management to route trades to it.'
            : 'No broker is connected yet. All Option Chain trades continue to execute as Paper Trades until a broker is authenticated here.'}
        </span>
      </div>

      {/* Broker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BROKERS.map((broker) => (
          <BrokerCard
            key={broker.id}
            broker={broker}
            connected={!!connections[broker.id] || ADAPTERS_BY_ID[broker.id].isAuthenticated()}
            onConnect={() => handleConnect(broker.id)}
          />
        ))}
      </div>

      {/* Angel One login UI — no SmartAPI call, values stay in local state */}
      <AngelOneLoginModal open={angelOneModalOpen} onClose={() => setAngelOneModalOpen(false)} />

      {/* Placeholder modal for the other brokers */}
      <Modal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} title="Broker Integration" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-200">Broker integration coming soon.</p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setComingSoonOpen(false)}>Got it</Button>
          </div>
        </div>
      </Modal>

      {/* Entitlement diagnostic results — temporary */}
      <Modal open={!!diagResult || !!diagError} onClose={() => { setDiagResult(null); setDiagError(null); }} title="Entitlement Check Result" size="lg">
        {diagError ? (
          <p className="text-sm text-loss">{diagError}</p>
        ) : (
          <pre className="text-xs text-ink-100 bg-ink-900 border border-ink-600 rounded-xl p-3 overflow-auto max-h-[70vh] whitespace-pre-wrap">
            {diagResult}
          </pre>
        )}
      </Modal>
    </div>
  );
}
