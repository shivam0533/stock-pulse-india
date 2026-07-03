import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, History, Search, SlidersHorizontal,
  TrendingDown, TrendingUp, X, XCircle, Minus,
} from 'lucide-react';
import { Card } from '@components/ui';
import { formatDate, formatINR, formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import {
  MOCK_TRADES, TRADE_STRATEGIES, computeTradeSummary, exportTradesCSV,
} from '@api/tradeHistoryMockData';
import type { TradeFilter, TradeRecord, TradeSortKey, TradeStatus } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const D = 86_400_000;

const STATUS_CONFIG: Record<TradeStatus, {
  label: string; icon: typeof CheckCircle2;
  badge: string; dot: string;
}> = {
  WIN:       { label: 'WIN',       icon: CheckCircle2, badge: 'bg-gain-subtle text-gain border-gain-border',         dot: 'bg-gain'      },
  LOSS:      { label: 'LOSS',      icon: XCircle,      badge: 'bg-loss-subtle text-loss border-loss-border',         dot: 'bg-loss'      },
  OPEN:      { label: 'OPEN',      icon: Clock,        badge: 'bg-brand-400/15 text-brand-300 border-brand-400/30',  dot: 'bg-brand-400' },
  BREAKEVEN: { label: 'B/E',       icon: Minus,        badge: 'bg-ink-700 text-ink-200 border-ink-600',             dot: 'bg-ink-400'   },
};

const STRATEGY_BADGE: Record<string, string> = {
  'Momentum Breakout':    'bg-gain-subtle text-gain',
  'Mean Reversion':       'bg-cyan-500/10 text-cyan-400',
  'VWAP Scalper':         'bg-purple-500/10 text-purple-400',
  'Trend Following (EMA)':'bg-brand-400/15 text-brand-300',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusOf(s: TradeStatus | 'ALL'): boolean { return s === 'ALL'; }

function periodCutoff(period: TradeFilter['period']): number {
  const now = new Date('2026-07-01').getTime();
  if (period === '7D')  return now - 7 * D;
  if (period === '30D') return now - 30 * D;
  if (period === '90D') return now - 90 * D;
  return 0;
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ trades }: { trades: TradeRecord[] }) {
  const s = computeTradeSummary(trades);
  const pos = s.netPnL >= 0;

  const tiles = [
    { label: 'Total Trades',  value: String(s.total),              color: 'text-ink-50'     },
    { label: 'Win Rate',       value: `${s.winRate}%`,              color: 'text-gain'       },
    { label: 'Wins',           value: String(s.wins),               color: 'text-gain'       },
    { label: 'Losses',         value: String(s.losses),             color: 'text-loss'       },
    { label: 'Open',           value: String(s.open),               color: 'text-brand-300'  },
    { label: 'Total Profit',   value: formatINR(s.totalProfit, { compact: true }), color: 'text-gain' },
    { label: 'Total Loss',     value: formatINR(s.totalLoss,   { compact: true }), color: 'text-loss' },
    { label: 'Net P&L',        value: `${pos ? '+' : ''}${formatINR(s.netPnL, { compact: true })}`, color: pos ? 'text-gain' : 'text-loss' },
    { label: 'Avg Win',        value: `+₹${formatIndianNumber(s.avgWin, 0)}`,      color: 'text-gain' },
    { label: 'Avg Loss',       value: `-₹${formatIndianNumber(s.avgLoss, 0)}`,     color: 'text-loss' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {tiles.map(({ label, value, color }) => (
        <div key={label} className="bg-ink-800/60 border border-ink-600/60 rounded-xl px-3 py-2.5">
          <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
          <div className={cn('font-mono text-lg font-bold tabular-nums mt-0.5', color)}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function TradeRow({ trade, index }: { trade: TradeRecord; index: number }) {
  const { label, icon: Icon, badge, dot } = STATUS_CONFIG[trade.status];
  const strategyColor = STRATEGY_BADGE[trade.strategy] ?? 'bg-ink-700 text-ink-300';

  return (
    <motion.tr
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: index * 0.03 }}
      className="group border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors"
    >
      {/* Date */}
      <td className="px-4 py-3 text-left whitespace-nowrap">
        <div className="text-xs text-ink-50 font-medium">{formatDate(trade.entryDate)}</div>
        {trade.exitDate && (
          <div className="text-2xs text-ink-400 mt-0.5">→ {formatDate(trade.exitDate)}</div>
        )}
        <div className="text-2xs text-ink-400 mt-0.5">{trade.holdingDays}d</div>
      </td>

      {/* Stock */}
      <td className="px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-0.5 rounded-full shrink-0', dot)} />
          <div>
            <div className="font-display text-sm font-bold text-ink-50">{trade.symbol}</div>
            <div className="text-2xs text-ink-300 max-w-[120px] truncate">{trade.name}</div>
            <span className={cn(
              'inline-flex mt-0.5 text-2xs px-1.5 py-0.5 rounded',
              trade.side === 'LONG' ? 'bg-gain-subtle text-gain' : 'bg-loss-subtle text-loss'
            )}>
              {trade.side}
            </span>
          </div>
        </div>
      </td>

      {/* Strategy */}
      <td className="px-4 py-3 text-left hidden lg:table-cell">
        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-2xs font-medium', strategyColor)}>
          {trade.strategy}
        </span>
      </td>

      {/* Entry */}
      <td className="px-4 py-3 text-right">
        <div className="font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(trade.entryPrice)}</div>
        <div className="text-2xs text-ink-400 tabular-nums">{trade.quantity} qty</div>
      </td>

      {/* Exit */}
      <td className="px-4 py-3 text-right">
        {trade.exitPrice ? (
          <div className="font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(trade.exitPrice)}</div>
        ) : (
          <span className="text-2xs text-brand-300 font-medium">Open</span>
        )}
      </td>

      {/* Profit */}
      <td className="px-4 py-3 text-right">
        {trade.profit > 0 ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm font-semibold text-gain tabular-nums">
              +₹{formatIndianNumber(trade.profit, 0)}
            </span>
          </div>
        ) : (
          <span className="text-ink-500">—</span>
        )}
      </td>

      {/* Loss */}
      <td className="px-4 py-3 text-right">
        {trade.loss > 0 ? (
          <span className="font-mono text-sm font-semibold text-loss tabular-nums">
            -₹{formatIndianNumber(trade.loss, 0)}
          </span>
        ) : (
          <span className="text-ink-500">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold border', badge)}>
          <Icon size={10} />
          {label}
        </span>
      </td>
    </motion.tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TradeHistory() {
  const [filters, setFilters] = useState<TradeFilter>({
    search: '', status: 'ALL', strategy: 'ALL', period: '90D',
  });
  const [sortKey, setSortKey]   = useState<TradeSortKey>('entryDate');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [page, setPage]         = useState(1);

  const patch = (p: Partial<TradeFilter>) => { setFilters((f) => ({ ...f, ...p })); setPage(1); };

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(filters.period);
    return MOCK_TRADES.filter((t) => {
      if (t.entryDate < cutoff) return false;
      if (!statusOf(filters.status) && t.status !== filters.status) return false;
      if (filters.strategy !== 'ALL' && t.strategy !== filters.strategy) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.symbol.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.strategy.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'symbol')   return a.symbol.localeCompare(b.symbol) * dir;
      if (sortKey === 'strategy') return a.strategy.localeCompare(b.strategy) * dir;
      if (sortKey === 'status')   return a.status.localeCompare(b.status) * dir;
      const aVal = (a[sortKey] ?? 0) as number;
      const bVal = (b[sortKey] ?? 0) as number;
      return (aVal - bVal) * dir;
    });
  }, [filters, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageSlice   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: TradeSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExport = () => {
    const csv  = exportTradesCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const SortHeader = ({ label, k }: { label: string; k: TradeSortKey }) => (
    <button
      type="button"
      onClick={() => handleSort(k)}
      className="inline-flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-300 hover:text-ink-50 transition-colors select-none"
    >
      {label}
      <ArrowDownUp size={9} className={sortKey === k ? 'text-brand-300' : 'text-ink-600'} />
    </button>
  );

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
          <History size={20} className="text-brand-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            Trade History
          </h1>
          <p className="text-sm text-ink-200 mt-0.5">All executed trades · Mock data</p>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <SummaryStrip trades={filtered} />
      </motion.div>

      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-wrap gap-2 items-center"
      >
        {/* Search */}
        <div className="relative flex items-center bg-ink-800 border border-ink-600/60 rounded-xl focus-within:border-brand-400/60 transition-colors flex-1 min-w-[180px]">
          <Search size={14} className="ml-3 text-ink-300 shrink-0" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search symbol, name or strategy…"
            className="flex-1 bg-transparent h-10 px-2.5 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
          />
          {filters.search && (
            <button type="button" onClick={() => patch({ search: '' })} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
              <X size={13} />
            </button>
          )}
        </div>

        <SlidersHorizontal size={14} className="text-ink-400" />

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => patch({ status: e.target.value as TradeFilter['status'] })}
          className="bg-ink-800 border border-ink-600/60 rounded-xl text-xs text-ink-100 px-3 py-2.5 outline-none hover:border-ink-500 transition-colors"
        >
          {(['ALL', 'WIN', 'LOSS', 'OPEN', 'BREAKEVEN'] as const).map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>
          ))}
        </select>

        {/* Strategy */}
        <select
          value={filters.strategy}
          onChange={(e) => patch({ strategy: e.target.value })}
          className="bg-ink-800 border border-ink-600/60 rounded-xl text-xs text-ink-100 px-3 py-2.5 outline-none hover:border-ink-500 transition-colors"
        >
          <option value="ALL">All Strategies</option>
          {TRADE_STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Period */}
        <div className="flex bg-ink-800 border border-ink-600/60 rounded-xl p-0.5 gap-0.5">
          {(['7D', '30D', '90D', 'ALL'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => patch({ period: p })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filters.period === p ? 'bg-brand-400/20 text-brand-300' : 'text-ink-300 hover:text-ink-100',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-800 border border-ink-600/60 text-xs text-ink-200 hover:text-ink-50 hover:border-ink-500 transition-colors ml-auto"
        >
          <Download size={13} />
          Export CSV
        </button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-600/40">
            <span className="font-display text-sm font-semibold text-ink-50 flex items-center gap-2">
              <History size={15} className="text-brand-300" />
              {filtered.length} Trade{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">
              Page {safePage} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="border-b border-ink-600/30 bg-ink-800/50">
                  <th className="px-4 py-3 text-left"><SortHeader label="Date"     k="entryDate" /></th>
                  <th className="px-4 py-3 text-left"><SortHeader label="Stock"    k="symbol"    /></th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell"><SortHeader label="Strategy" k="strategy" /></th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Entry"   k="entryPrice" /></th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Exit"    k="exitPrice"  /></th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wide text-gain">
                      <TrendingUp size={9} /> Profit
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wide text-loss">
                      <TrendingDown size={9} /> Loss
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center"><SortHeader label="Status" k="status" /></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {pageSlice.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-sm text-ink-300">
                        No trades match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageSlice.map((trade, i) => (
                      <TradeRow key={trade.id} trade={trade} index={i} />
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-ink-600/40">
              <span className="text-xs text-ink-300">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 text-ink-200 hover:text-ink-50 hover:border-ink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      'h-7 min-w-7 px-2 rounded-lg text-xs font-medium border transition-colors',
                      p === safePage
                        ? 'bg-brand-400/20 text-brand-300 border-brand-400/40'
                        : 'border-ink-600 text-ink-300 hover:text-ink-50 hover:border-ink-500',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 text-ink-200 hover:text-ink-50 hover:border-ink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <p className="text-2xs text-ink-400 text-center pb-4">
        All trade records are mock/demo data. Not actual trades.
      </p>
    </div>
  );
}
