import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { generateAISignal } from '@services/aiDecisionEngine.service';
import { useOptionChain } from '@hooks/useOptionChain';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { formatTime } from '@utils/format';
import { cn } from '@utils/cn';

const REFRESH_MS = 8000;
/** Nearest expiry — same default the Option Chain page itself starts on. */
const EXPIRY_INDEX = 0;

/**
 * Dashboard summary card for Auto Trading (Prompt 4). Read-only — reflects
 * the existing useAutoTradingStore/useOptionChainRiskStore/
 * useBrokerConnectionStore exactly as they are; never toggles or executes
 * anything itself. "Last Signal Time" reuses the existing
 * generateAISignal() purely to show a timestamp, same as the AI Signal
 * Status card.
 */
export function AutoTradingStatusCard({ delay = 0 }: { delay?: number }) {
  const enabled = useAutoTradingStore((s) => s.enabled);
  const paperTradingOnly = useOptionChainRiskStore((s) => s.paperTradingOnly);
  const connections = useBrokerConnectionStore((s) => s.connections);

  const { data } = useOptionChain(EXPIRY_INDEX);
  const [lastSignalTime, setLastSignalTime] = useState<number | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;

    const tick = () => {
      const d = dataRef.current;
      if (!d) return;
      const atmRow = d.strikes.find((s) => s.strike === d.atmStrike) ?? d.strikes[0];
      if (!atmRow) return;
      const signal = generateAISignal({
        strike: d.atmStrike,
        expiry: d.expiry.label,
        spotPrice: d.spotPrice,
        pcr: d.pcr,
        maxPain: d.maxPain,
        row: atmRow,
      });
      setLastSignalTime(signal.generatedAt);
    };

    tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [data]);

  const connectedBroker = Object.values(connections).find((c) => !!c);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs text-ink-300 uppercase tracking-wide flex items-center gap-1.5">
          <Bot size={12} className="text-brand-300" />
          Auto Trading Status
        </span>
        <span
          className={cn(
            'h-2 w-2 rounded-full mt-1 shrink-0',
            enabled ? 'bg-gain animate-pulse-dot' : 'bg-ink-500',
          )}
        />
      </div>

      <div className={cn('mt-2 font-display text-xl font-bold tracking-tight', enabled ? 'text-gain' : 'text-ink-300')}>
        {enabled ? 'ON' : 'OFF'}
      </div>
      <div className="text-2xs text-ink-400 mt-0.5">
        {enabled ? 'Trades execute automatically' : 'AI only recommends'}
      </div>

      <div className="mt-3 space-y-1.5 text-2xs">
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Connected Broker</span>
          <span className="font-mono text-ink-100 truncate max-w-[140px]">
            {connectedBroker?.brokerName ?? 'Not Connected'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Paper Trading</span>
          <span className={cn('font-mono font-semibold', paperTradingOnly ? 'text-gain' : 'text-loss')}>
            {paperTradingOnly ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-300">Last Signal Time</span>
          <span className="font-mono text-ink-100 tabular-nums">
            {lastSignalTime ? formatTime(lastSignalTime) : '—'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
