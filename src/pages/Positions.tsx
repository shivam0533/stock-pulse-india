import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, RefreshCw, Plug } from 'lucide-react';
import { Card, Skeleton } from '@components/ui';
import { optionsService, subscribeToLivePositions, type NiftyPosition } from '@services/options.service';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';

/**
 * Real, live NIFTY option positions from the connected Angel One account
 * (Phase 9) — a separate, read-only view of the actual broker position book,
 * distinct from this app's own single-trade lifecycle (Active Trade /
 * Trade History), which only ever tracks trades placed through this app.
 * A position placed here or anywhere else on the same Angel One account
 * shows up here.
 */
export default function Positions() {
  const isConnected = useBrokerConnectionStore(
    (s) => !!s.connections.ANGEL_ONE && s.connections.ANGEL_ONE.sessionExpiresAt > Date.now(),
  );

  const [positions, setPositions] = useState<NiftyPosition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const data = await optionsService.getPositions();
      setPositions(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live LTP/MTM — the backend pushes a fresh snapshot over SSE the instant
  // a subscribed position's token ticks on the Angel One WebSocket, so this
  // page no longer depends on the manual Refresh button to stay current.
  useEffect(() => {
    if (!isConnected) return;
    setError(null);
    const unsubscribe = subscribeToLivePositions((live) => {
      setPositions(live);
      setLoading(false);
    });
    return unsubscribe;
  }, [isConnected]);

  const totalPnl = (positions ?? []).reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
            <Layers size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              Positions
            </h1>
            <p className="text-sm text-ink-200 mt-0.5">Live NIFTY option positions from your connected Angel One account</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={!isConnected || loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-800 border border-ink-600/60 text-xs text-ink-200 hover:text-ink-50 hover:border-ink-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {!isConnected ? (
        <Card>
          <div className="flex flex-col items-center justify-center text-center py-14 px-4">
            <div className="h-12 w-12 rounded-xl bg-ink-700/60 border border-ink-600 flex items-center justify-center mb-3">
              <Plug size={20} className="text-ink-400" />
            </div>
            <p className="text-sm text-ink-200">Angel One is not connected.</p>
            <p className="text-xs text-ink-400 mt-1">Connect your broker on the Broker Integration page to view live positions.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-600/40">
            <span className="font-display text-sm font-semibold text-ink-50 flex items-center gap-2">
              <Layers size={15} className="text-brand-300" />
              {positions?.length ?? 0} Open Position{(positions?.length ?? 0) !== 1 ? 's' : ''}
            </span>
            {positions && positions.length > 0 && (
              <span className={cn('font-mono text-sm font-semibold tabular-nums', totalPnl >= 0 ? 'text-gain' : 'text-loss')}>
                Total MTM: {totalPnl >= 0 ? '+' : ''}₹{formatIndianNumber(Math.abs(totalPnl), 0)}
              </span>
            )}
          </div>

          {loading && !positions ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="px-5 py-10 text-center text-xs text-loss">{error}</p>
          ) : !positions || positions.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-ink-300">No open NIFTY option positions right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="border-b border-ink-600/30 bg-ink-800/50 text-2xs uppercase tracking-wide text-ink-300">
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-center">Product</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Avg Price</th>
                    <th className="px-4 py-3 text-right">Current LTP</th>
                    <th className="px-4 py-3 text-right">Today&apos;s P&amp;L (MTM)</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const profit = p.pnl >= 0;
                    return (
                      <tr key={p.tradingSymbol} className="border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors">
                        <td className="px-4 py-3 text-left font-mono text-sm text-ink-50">{p.tradingSymbol}</td>
                        <td className="px-4 py-3 text-center text-2xs text-ink-200">
                          {p.productType === 'CARRYFORWARD' ? 'NRML' : p.productType}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums">{p.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(p.averagePrice)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(p.ltp)}</td>
                        <td className={cn('px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums', profit ? 'text-gain' : 'text-loss')}>
                          {profit ? '+' : ''}₹{formatIndianNumber(Math.abs(p.pnl), 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
