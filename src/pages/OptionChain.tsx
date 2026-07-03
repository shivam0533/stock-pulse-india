import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@components/ui';
import { OptionStatsStrip } from '@components/options/OptionStatsStrip';
import { OptionFiltersBar } from '@components/options/OptionFiltersBar';
import { OptionChainTable } from '@components/options/OptionChainTable';
import { useOptionChain } from '@hooks/useOptionChain';
import { OPTION_EXPIRIES } from '@api/optionsMockData';
import type { OptionChainFilter } from '@/types';

const REFRESH_INTERVAL = 30;

const DEFAULT_FILTERS: OptionChainFilter = {
  expiryIndex: 0,
  strikesAround: 20,
  sortKey: 'strike',
  sortDir: 'asc',
  search: '',
};

export default function OptionChain() {
  const [filters, setFilters] = useState<OptionChainFilter>(DEFAULT_FILTERS);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(countdown);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useOptionChain(filters.expiryIndex);

  const refetchNow = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['option-chain', filters.expiryIndex] });
    setCountdown(REFRESH_INTERVAL);
    countdownRef.current = REFRESH_INTERVAL;
  }, [queryClient, filters.expiryIndex]);

  // Countdown tick
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) refetchNow();
    }, 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refetchNow]);

  // Reset countdown on expiry change
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);
    countdownRef.current = REFRESH_INTERVAL;
  }, [filters.expiryIndex]);

  const patchFilters = useCallback((patch: Partial<OptionChainFilter>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={22} className="text-brand-300" />
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              NIFTY Option Chain
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-200">
            Live open interest, volume, and LTP across all strikes
            {data && (
              <span className="ml-2 text-ink-300">
                · Updated{' '}
                {new Intl.DateTimeFormat('en-IN', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                }).format(new Date(data.updatedAt))}
              </span>
            )}
          </p>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-4 text-2xs text-ink-300 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-brand-400" />
            ATM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-ink-600" />
            ITM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-ink-800 border border-ink-600" />
            OTM
          </span>
        </div>
      </motion.div>

      {/* Stats strip */}
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <OptionStatsStrip data={data} />
        </motion.div>
      )}

      {/* Filters */}
      <OptionFiltersBar
        expiries={OPTION_EXPIRIES}
        filters={filters}
        onChange={patchFilters}
        refreshCountdown={countdown}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => {
          setAutoRefresh((v) => !v);
          setCountdown(REFRESH_INTERVAL);
          countdownRef.current = REFRESH_INTERVAL;
        }}
        onManualRefresh={refetchNow}
        isRefreshing={isFetching}
      />

      {/* Refresh progress bar */}
      {autoRefresh && (
        <div className="h-0.5 w-full bg-ink-700 rounded-full overflow-hidden -mt-2">
          <motion.div
            className="h-full bg-brand-400/60 rounded-full"
            animate={{ width: `${(countdown / REFRESH_INTERVAL) * 100}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>
      )}

      {/* Main table */}
      {isLoading || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <OptionChainTable data={data} filters={filters} />
        </motion.div>
      )}

      {/* Footer note */}
      <p className="text-2xs text-ink-300 text-center pb-2">
        Data is illustrative. Not connected to any live NSE feed.
        Option prices computed via Black-Scholes with a volatility smile model.
      </p>
    </div>
  );
}
