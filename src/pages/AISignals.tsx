import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw } from 'lucide-react';
import { Skeleton } from '@components/ui';
import { SignalCard } from '@components/signals/SignalCard';
import { SignalFilters } from '@components/signals/SignalFilters';
import { SignalStats } from '@components/signals/SignalStats';
import { MOCK_DETAILED_SIGNALS, DEFAULT_SIGNAL_FILTERS, filterSignals } from '@api/signalsMockData';
import type { SignalFilterState } from '@/types';

export default function AISignals() {
  const [filters, setFilters] = useState<SignalFilterState>(DEFAULT_SIGNAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const filteredSignals = useMemo(
    () => filterSignals(MOCK_DETAILED_SIGNALS, filters),
    [filters],
  );

  const patchFilters = (patch: Partial<SignalFilterState>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-400/15">
              <Zap size={18} className="text-brand-300" />
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              AI Trading Signals
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-200 ml-12">
            Machine-learning generated signals with technical indicator confluence
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-800 border border-ink-600 text-sm text-ink-200 hover:text-ink-50 hover:border-ink-500 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </motion.div>

      {/* Stats strip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <SignalStats signals={MOCK_DETAILED_SIGNALS} />
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <SignalFilters
          filters={filters}
          onChange={patchFilters}
          signals={MOCK_DETAILED_SIGNALS}
        />
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          Showing <span className="text-ink-50 font-medium">{filteredSignals.length}</span> of{' '}
          <span className="text-ink-50 font-medium">{MOCK_DETAILED_SIGNALS.length}</span> signals
        </p>
        <p className="text-2xs text-ink-300 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gain animate-pulse" />
          Auto-generated · Mock data
        </p>
      </div>

      {/* Card grid with animated layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[480px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${refreshKey}-${filters.action}-${filters.risk}-${filters.strength}-${filters.search}-${filters.sortBy}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {filteredSignals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Zap size={40} className="text-ink-500 mb-4" />
                <h3 className="font-display text-lg font-semibold text-ink-200">No signals match</h3>
                <p className="mt-2 text-sm text-ink-300 max-w-xs">
                  Try adjusting the filters or clearing your search to see more signals.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {filteredSignals.map((signal, i) => (
                  <SignalCard key={signal.id} signal={signal} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <p className="text-2xs text-ink-300 text-center pb-4">
        Signals are AI-generated for demonstration purposes only. Not financial advice.
        Always perform your own due diligence before trading.
      </p>
    </div>
  );
}
