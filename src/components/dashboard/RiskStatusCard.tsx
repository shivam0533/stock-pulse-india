import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { cn } from '@utils/cn';

/**
 * Dashboard summary card for Option Chain Risk Settings (Prompt 1) — purely
 * read-only, reflects useOptionChainRiskStore exactly as configured on the
 * Risk Management tab. "Current Risk Level" is a simple display label
 * derived from the existing Paper Trading toggle (Paper Trading = Low risk,
 * live routing = High risk) — not a new risk calculation.
 */
export function RiskStatusCard({ delay = 0 }: { delay?: number }) {
  const { maxLossPercent, maxProfitPercent, applyAutomatically, paperTradingOnly } = useOptionChainRiskStore();
  const riskLevel = paperTradingOnly ? 'Low' : 'High';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs text-ink-300 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-brand-300" />
          Risk Status
        </span>
        <span
          className={cn(
            'text-2xs font-bold px-2 py-0.5 rounded-md border shrink-0',
            paperTradingOnly ? 'text-gain bg-gain-subtle border-gain-border' : 'text-loss bg-loss-subtle border-loss-border',
          )}
        >
          {riskLevel} Risk
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-ink-700/40 rounded-xl px-3 py-2 border border-ink-600/40">
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Stop Loss</div>
          <div className="font-mono text-lg font-bold text-loss tabular-nums">{maxLossPercent}%</div>
        </div>
        <div className="bg-ink-700/40 rounded-xl px-3 py-2 border border-ink-600/40">
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Target Profit</div>
          <div className="font-mono text-lg font-bold text-gain tabular-nums">{maxProfitPercent}%</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-2xs">
        <span className="text-ink-300">Auto Apply</span>
        <span className={cn('font-mono font-semibold', applyAutomatically ? 'text-gain' : 'text-ink-400')}>
          {applyAutomatically ? 'ON' : 'OFF'}
        </span>
      </div>
    </motion.div>
  );
}
