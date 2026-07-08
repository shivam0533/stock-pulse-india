import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { OptionTradeSummary } from '@components/options/OptionTradeSummary';

/**
 * Performance — Overall Trading Summary (Net P&L, Win Rate, Best/Worst
 * Trade, statistics), moved here verbatim from the Option Chain page. Same
 * component, same useOptionTradeStore + computeOptionTradeSummary — reflects
 * every completed trade immediately, regardless of which page it was closed
 * from.
 */
export default function Performance() {
  return (
    <div className="space-y-5 max-w-[640px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <BarChart3 size={22} className="text-brand-300" />
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            Performance
          </h1>
          <p className="mt-1 text-sm text-ink-200">
            Overall trading summary for NIFTY Option Chain paper trades
          </p>
        </div>
      </motion.div>

      <OptionTradeSummary />
    </div>
  );
}
