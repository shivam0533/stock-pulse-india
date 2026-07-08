import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, WifiOff } from 'lucide-react';
import { Skeleton } from '@components/ui';
import { getAngelOneFunds, type AccountFunds } from '@services/broker/accountFunds.service';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';

const REFRESH_MS = 15_000;

function FundTile({
  label, value, accent = 'neutral',
}: { label: string; value: string; accent?: 'gain' | 'loss' | 'brand' | 'neutral' }) {
  const textClass = {
    gain: 'text-gain', loss: 'text-loss', brand: 'text-brand-300', neutral: 'text-ink-50',
  }[accent];

  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1 whitespace-nowrap">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums truncate', textClass)}>{value}</div>
    </div>
  );
}

/**
 * Live Account Funds widget — real Angel One balance/margin figures via the
 * existing authenticated SmartAPI session (accountFunds.service.ts ->
 * GET /api/broker/ANGEL_ONE/funds -> the shared AngelOneService singleton).
 * No new login flow: this only ever reads brokerConnection.store's existing
 * "Connected" state and, if connected, polls the existing funds endpoint.
 */
export function AccountFundsWidget({ delay = 0 }: { delay?: number }) {
  const isConnected = useBrokerConnectionStore(
    (s) => !!s.connections.ANGEL_ONE && s.connections.ANGEL_ONE.sessionExpiresAt > Date.now(),
  );

  const [funds, setFunds] = useState<AccountFunds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await getAngelOneFunds();
      setFunds(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) {
      setFunds(null);
      setError(null);
      setLastUpdated(null);
      return;
    }
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [isConnected, refresh]);

  const disconnected = !isConnected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xs text-ink-300 uppercase tracking-wide flex items-center gap-1.5">
          <Wallet size={12} className="text-brand-300" />
          Account Funds
        </span>
        <span
          className={cn(
            'text-2xs font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1',
            disconnected
              ? 'text-loss bg-loss-subtle border-loss-border'
              : 'text-gain bg-gain-subtle border-gain-border',
          )}
        >
          {disconnected && <WifiOff size={10} />}
          {disconnected ? 'Broker Disconnected' : 'Angel One · Live'}
        </span>
      </div>

      {disconnected ? (
        <div className="flex flex-col items-center justify-center text-center py-6 px-2">
          <p className="text-xs text-ink-300">
            Connect Angel One on the Broker Integration page to see your real account funds here.
          </p>
        </div>
      ) : error ? (
        <p className="text-xs text-loss py-4 text-center">{error}</p>
      ) : loading && !funds ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : funds ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <FundTile label="Available Balance" value={`₹${formatIndianNumber(funds.availableCash, 0)}`} accent="brand" />
            <FundTile label="Available Margin" value={`₹${formatIndianNumber(funds.availableMargin, 0)}`} accent="gain" />
            <FundTile label="Used Margin" value={`₹${formatIndianNumber(funds.utilisedMargin, 0)}`} accent="loss" />
            <FundTile label="Opening Balance" value={`₹${formatIndianNumber(funds.openingBalance, 0)}`} />
            <FundTile
              label="Net Available"
              value={`₹${formatIndianNumber(funds.net, 0)}`}
              accent={funds.net >= 0 ? 'gain' : 'loss'}
            />
          </div>
          <div className="mt-3 text-2xs text-ink-400 text-right">
            Last Updated:{' '}
            <span className="font-mono text-ink-200 tabular-nums">
              {lastUpdated
                ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(lastUpdated))
                : '—'}
            </span>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
