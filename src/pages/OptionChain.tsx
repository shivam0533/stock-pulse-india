import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@components/ui';
import { OptionStatsStrip } from '@components/options/OptionStatsStrip';
import { OptionFiltersBar } from '@components/options/OptionFiltersBar';
import { OptionChainTable } from '@components/options/OptionChainTable';
import { OrderWindowModal, type OrderDraft } from '@components/options/OrderWindowModal';
import { OptionChainToaster } from '@components/options/OptionChainToaster';
import { AIDecisionEngineCard } from '@components/options/AIDecisionEngineCard';
import { AITradeSelectionPanel } from '@components/options/AITradeSelectionPanel';
import { AIReasoningPanel } from '@components/options/AIReasoningPanel';
import { ActiveTradePanel } from '@components/options/ActiveTradePanel';
import { OptionChainRiskSettings } from '@components/options/OptionChainRiskSettings';
import { AutoTradingPanel } from '@components/options/AutoTradingPanel';
import { useOptionChain, useOptionExpiries } from '@hooks/useOptionChain';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { cn } from '@utils/cn';
import type { OptionChainFilter } from '@/types';

const DEFAULT_FILTERS: OptionChainFilter = {
  expiryIndex:   0,
  strikesAround: 20,
  sortKey:       'strike',
  sortDir:       'asc',
  search:        '',
};

type TabKey = 'option-chain' | 'ai-signals' | 'trading' | 'risk-management';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'option-chain', label: 'Option Chain' },
  { key: 'ai-signals', label: 'AI Signals' },
  { key: 'trading', label: 'Trading' },
  { key: 'risk-management', label: 'Risk Management' },
];

export default function OptionChain() {
  const [activeTab, setActiveTab]     = useState<TabKey>('option-chain');
  const [filters, setFilters]         = useState<OptionChainFilter>(DEFAULT_FILTERS);
  const [orderDraft, setOrderDraft]   = useState<OrderDraft | null>(null);
  const queryClient  = useQueryClient();

  const { data, isLoading, isFetching } = useOptionChain(filters.expiryIndex);

  // Real, live NIFTY expiry list (Angel One instrument master) — re-checked
  // every minute so it stays correct if the app is left open across a day
  // (or Thursday expiry) rollover.
  const { data: expiriesData } = useOptionExpiries();
  const expiries = expiriesData ?? [];

  // Option trade store — only the "is a trade already open" flag is needed
  // outside the Trading tab (to disable BUY buttons on the table).
  const activeTrade = useOptionTradeStore((s) => s.activeTrade);
  const hasActiveTrade = activeTrade?.status === 'OPEN';

  // Manual force-refresh only — real-time freshness comes from the SSE
  // stream inside useOptionChain, not from any timer.
  const refetchNow = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['option-chain', filters.expiryIndex] });
  }, [queryClient, filters.expiryIndex]);

  const patchFilters = useCallback((patch: Partial<OptionChainFilter>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const handleBuyOption = useCallback(
    (strike: number, side: 'CE' | 'PE', ltp: number) => {
      const selectedExpiry = expiries[filters.expiryIndex];
      setOrderDraft({
        strike, side, ltp,
        expiry: selectedExpiry?.label ?? '',
        expiryRaw: selectedExpiry?.raw,
        lotSize: selectedExpiry?.lotSize ?? 0,
      });
    },
    [filters.expiryIndex, expiries],
  );

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <OptionChainToaster />

      {/* ── Page header ─────────────────────────────────────────────────── */}
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
                · Last Updated:{' '}
                <span className="font-mono font-semibold text-ink-50 tabular-nums">
                  {new Intl.DateTimeFormat('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                  }).format(new Date(data.updatedAt))}
                </span>
              </span>
            )}
          </p>
        </div>

        {/* Legend */}
        {activeTab === 'option-chain' && (
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
        )}
      </motion.div>

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-ink-800/80 border border-ink-600/60 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-brand-400/20 text-brand-300'
                : 'text-ink-300 hover:text-ink-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Option Chain tab ─────────────────────────────────────────────── */}
      {activeTab === 'option-chain' && (
        <>
          {isLoading || !data ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <OptionStatsStrip data={data} />
            </motion.div>
          )}

          <div className="space-y-5 min-w-0">
            <OptionFiltersBar
              expiries={expiries}
              filters={filters}
              onChange={patchFilters}
              onManualRefresh={refetchNow}
              isRefreshing={isFetching}
            />

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
                <OptionChainTable
                  data={data}
                  filters={filters}
                  onBuyOption={handleBuyOption}
                  tradingDisabled={hasActiveTrade}
                />
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* ── AI Signals tab ───────────────────────────────────────────────── */}
      {activeTab === 'ai-signals' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <AIDecisionEngineCard data={data} />
          <AITradeSelectionPanel data={data} />
          <div className="xl:col-span-2">
            <AIReasoningPanel data={data} />
          </div>
        </div>
      )}

      {/* ── Trading tab ──────────────────────────────────────────────────── */}
      {activeTab === 'trading' && (
        <div className="max-w-[900px]">
          <ActiveTradePanel data={data} />
        </div>
      )}

      {/* ── Risk Management tab ──────────────────────────────────────────── */}
      {activeTab === 'risk-management' && (
        <div className="max-w-[520px] space-y-5">
          <OptionChainRiskSettings />
          <AutoTradingPanel />
        </div>
      )}

      {/* ── Order Window ─────────────────────────────────────────────────── */}
      <OrderWindowModal draft={orderDraft} onClose={() => setOrderDraft(null)} />

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <p className="text-2xs text-ink-300 text-center pb-2">
        Data is illustrative. Not connected to any live NSE feed.
        Option prices computed via Black-Scholes with a volatility smile model.
        · Risk management: SL at −3% / Target at +7% of entry premium.
      </p>
    </div>
  );
}
