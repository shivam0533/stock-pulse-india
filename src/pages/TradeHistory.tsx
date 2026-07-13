import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ArrowDownUp, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardList, Clock, Download, Search, Shield, SlidersHorizontal, Trash2, X,
} from 'lucide-react';
import { Card } from '@components/ui';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { computeOptionTradeSummary } from '@services/optionTradeStats.service';
import { formatINR, formatIndianNumber, formatDate, formatTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { CompletedOptionTrade } from '@/types';

const PAGE_SIZE = 10;
const D = 86_400_000;

type SortKey = 'exitTime' | 'strike' | 'pnlAmount' | 'pnlPercent';
type SortDir = 'asc' | 'desc';
type SideFilter = 'ALL' | 'CE' | 'PE';
type ExitFilter = 'ALL' | 'MANUAL' | 'AUTO';
type Period = 'TODAY' | '7D' | '30D' | 'ALL';

const EXIT_KIND_CONFIG: Record<CompletedOptionTrade['exitKind'], {
  icon: typeof CheckCircle2; badge: string; isManual: boolean;
}> = {
  STOP_LOSS:       { icon: AlertTriangle, badge: 'bg-loss-subtle text-loss border-loss-border',           isManual: false },
  TARGET:          { icon: CheckCircle2,  badge: 'bg-gain-subtle text-gain border-gain-border',           isManual: false },
  AUTO_SQUARE_OFF: { icon: Clock,         badge: 'bg-brand-400/15 text-brand-300 border-brand-400/30',    isManual: false },
  MANUAL:          { icon: Shield,        badge: 'bg-ink-700 text-ink-200 border-ink-600',                isManual: true  },
};

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function periodCutoff(period: Period): number {
  if (period === 'TODAY') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (period === '7D') return Date.now() - 7 * D;
  if (period === '30D') return Date.now() - 30 * D;
  return 0;
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ trades }: { trades: CompletedOptionTrade[] }) {
  const s = computeOptionTradeSummary(trades, null);
  const pos = s.netPnlAmount >= 0;

  const tiles = [
    { label: 'Total Trades',  value: String(s.totalTrades),                                color: 'text-ink-50'    },
    { label: 'Win Rate',      value: `${s.winRatePercent.toFixed(1)}%`,                     color: 'text-gain'      },
    { label: 'Wins',          value: String(s.winningTrades),                               color: 'text-gain'      },
    { label: 'Losses',        value: String(s.losingTrades),                                color: 'text-loss'      },
    { label: 'Gross Profit',  value: formatINR(s.grossProfit),            color: 'text-gain'      },
    { label: 'Gross Loss',    value: formatINR(s.grossLoss),               color: 'text-loss'      },
    { label: 'Net P&L',       value: `${pos ? '+' : ''}${formatINR(s.netPnlAmount)}`, color: pos ? 'text-gain' : 'text-loss' },
    { label: 'Avg Win',       value: `+₹${formatIndianNumber(s.avgProfitPerWin, 0)}`,        color: 'text-gain'      },
    { label: 'Avg Loss',      value: `-₹${formatIndianNumber(s.avgLossPerLoss, 0)}`,         color: 'text-loss'      },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
function TradeRow({ trade, index }: { trade: CompletedOptionTrade; index: number }) {
  const config = EXIT_KIND_CONFIG[trade.exitKind];
  const Icon = config.icon;
  const profit = trade.pnlAmount >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index, 10) * 0.02 }}
      className="group border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/25 transition-colors"
    >
      {/* Trade Time */}
      <td className="px-4 py-3 text-left whitespace-nowrap">
        <div className="text-xs text-ink-50 font-medium">{formatDate(trade.entryTime)}</div>
        <div className="text-2xs text-ink-400 mt-0.5">{formatTime(trade.entryTime)} → {formatTime(trade.exitTime)}</div>
        <div className="text-2xs text-ink-400 mt-0.5">{formatDuration(trade.exitTime - trade.entryTime)}</div>
      </td>

      {/* Strike / Side / Expiry */}
      <td className="px-4 py-3 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-ink-50 tabular-nums">{formatIndianNumber(trade.strike, 0)}</span>
          <span
            className={cn(
              'text-2xs font-bold px-1.5 py-0.5 rounded border shrink-0',
              trade.side === 'CE'
                ? 'text-loss bg-loss-subtle border-loss-border'
                : 'text-gain bg-gain-subtle border-gain-border',
            )}
          >
            {trade.side}
          </span>
        </div>
        <div className="text-2xs text-ink-300 mt-0.5">{trade.expiry}</div>
      </td>

      {/* Entry -> Exit */}
      <td className="px-4 py-3 text-right">
        <div className="font-mono text-sm text-ink-100 tabular-nums">₹{formatIndianNumber(trade.entryPrice)}</div>
        <div className="text-2xs text-ink-400 tabular-nums">→ ₹{formatIndianNumber(trade.exitPrice)}</div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <div className="font-mono text-sm text-ink-100 tabular-nums">{trade.quantity}</div>
        <div className="text-2xs text-ink-400">{trade.lots} lot{trade.lots > 1 ? 's' : ''}</div>
      </td>

      {/* Buy/Sell */}
      <td className="px-4 py-3 text-center hidden lg:table-cell">
        <span className="inline-flex px-2 py-0.5 rounded-md text-2xs font-bold bg-gain-subtle text-gain border border-gain-border">
          BUY
        </span>
      </td>

      {/* Order Type / Product Type */}
      <td className="px-4 py-3 text-center hidden lg:table-cell">
        <div className="text-2xs font-mono text-ink-200">{trade.orderType}</div>
        <div className="text-2xs text-ink-400 mt-0.5">{trade.productType === 'CARRYFORWARD' ? 'NRML' : 'MIS'}</div>
      </td>

      {/* Stop Loss / Target */}
      <td className="px-4 py-3 text-right hidden xl:table-cell">
        <div className="font-mono text-2xs text-loss tabular-nums">SL ₹{formatIndianNumber(trade.stopLoss)}</div>
        <div className="font-mono text-2xs text-gain tabular-nums">TG ₹{formatIndianNumber(trade.target)}</div>
      </td>

      {/* Profit / Loss */}
      <td className="px-4 py-3 text-right">
        <div className={cn('font-mono text-sm font-semibold tabular-nums', profit ? 'text-gain' : 'text-loss')}>
          {profit ? '+' : ''}₹{formatIndianNumber(trade.pnlAmount, 0)}
        </div>
        <div className={cn('text-2xs font-mono tabular-nums', profit ? 'text-gain' : 'text-loss')}>
          {profit ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
        </div>
      </td>

      {/* Order Status / Exit type */}
      <td className="px-4 py-3 text-center">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold border', config.badge)}>
          <Icon size={10} />
          {config.isManual ? 'Manual Exit' : 'Auto Exit'}
        </span>
        <div className="text-2xs text-ink-400 mt-1 max-w-[140px]">{trade.exitReason}</div>
      </td>

      {/* Strategy Name */}
      <td className="px-4 py-3 text-left hidden xl:table-cell">
        <span className="text-2xs text-ink-200 whitespace-nowrap">{trade.strategyName}</span>
      </td>

      {/* Broker Order ID */}
      <td className="px-4 py-3 text-left hidden xl:table-cell">
        <span className="font-mono text-2xs text-ink-400 truncate max-w-[130px] inline-block" title={trade.id}>
          {trade.id}
        </span>
      </td>
    </motion.tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TradeHistory() {
  const history = useOptionTradeStore((s) => s.history);
  const clearHistory = useOptionTradeStore((s) => s.clearHistory);

  const [search, setSearch]     = useState('');
  const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
  const [exitFilter, setExitFilter] = useState<ExitFilter>('ALL');
  const [period, setPeriod]     = useState<Period>('ALL');
  const [sortKey, setSortKey]   = useState<SortKey>('exitTime');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');
  const [page, setPage]         = useState(1);

  const handleSideFilter = (s: SideFilter) => { setSideFilter(s); setPage(1); };
  const handleExitFilter = (v: ExitFilter) => { setExitFilter(v); setPage(1); };
  const handlePeriod     = (p: Period) => { setPeriod(p); setPage(1); };

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    let result = history.filter((t) => t.exitTime >= cutoff);

    if (sideFilter !== 'ALL') result = result.filter((t) => t.side === sideFilter);
    if (exitFilter !== 'ALL') {
      result = result.filter((t) => {
        const isManual = EXIT_KIND_CONFIG[t.exitKind].isManual;
        return exitFilter === 'MANUAL' ? isManual : !isManual;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        String(t.strike).includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.expiry.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [history, search, sideFilter, exitFilter, period, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const handleExport = () => {
    const header = [
      'Strike', 'Side', 'Expiry', 'Entry Price', 'Exit Price', 'Quantity', 'Lots',
      'Buy/Sell', 'Order Type', 'Product Type', 'Stop Loss', 'Target', 'P&L Amount', 'P&L %', 'Order Status',
      'Exit Type', 'Strategy', 'Broker Order ID', 'Entry Time', 'Exit Time', 'Duration',
    ];
    const rows = filtered.map((t) => [
      t.strike, t.side, t.expiry, t.entryPrice, t.exitPrice, t.quantity, t.lots,
      'BUY', t.orderType, t.productType === 'CARRYFORWARD' ? 'NRML' : 'MIS', t.stopLoss, t.target, t.pnlAmount, t.pnlPercent, t.exitReason,
      EXIT_KIND_CONFIG[t.exitKind].isManual ? 'Manual' : 'Auto', t.strategyName, t.id,
      new Date(t.entryTime).toISOString(), new Date(t.exitTime).toISOString(),
      formatDuration(t.exitTime - t.entryTime),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `option-chain-trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
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
    <div className="space-y-5 max-w-[1600px] mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
            <ClipboardList size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              Trade History
            </h1>
            <p className="text-sm text-ink-200 mt-0.5">NIFTY Option Chain trades only · Paper and live orders</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs text-loss border-loss/30 bg-loss-subtle hover:bg-loss/20 transition-colors"
          >
            <Trash2 size={12} /> Clear all
          </button>
        )}
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
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search strike, expiry, or order ID…"
            className="flex-1 bg-transparent h-10 px-2.5 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
              <X size={13} />
            </button>
          )}
        </div>

        <SlidersHorizontal size={14} className="text-ink-400" />

        {/* Side filter */}
        <div className="flex bg-ink-800 border border-ink-600/60 rounded-xl p-0.5 gap-0.5">
          {(['ALL', 'CE', 'PE'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSideFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                sideFilter === s ? 'bg-brand-400/20 text-brand-300' : 'text-ink-300 hover:text-ink-100',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Exit type filter */}
        <select
          value={exitFilter}
          onChange={(e) => handleExitFilter(e.target.value as ExitFilter)}
          className="bg-ink-800 border border-ink-600/60 rounded-xl text-xs text-ink-100 px-3 py-2.5 outline-none hover:border-ink-500 transition-colors"
        >
          <option value="ALL">All Exits</option>
          <option value="MANUAL">Manual Exit</option>
          <option value="AUTO">Auto Exit</option>
        </select>

        {/* Period */}
        <div className="flex bg-ink-800 border border-ink-600/60 rounded-xl p-0.5 gap-0.5">
          {(['TODAY', '7D', '30D', 'ALL'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                period === p ? 'bg-brand-400/20 text-brand-300' : 'text-ink-300 hover:text-ink-100',
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
              <ClipboardList size={15} className="text-brand-300" />
              {filtered.length} Trade{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">
              Page {safePage} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-ink-600/30 bg-ink-800/50">
                  <th className="px-4 py-3 text-left"><SortHeader label="Trade Time" k="exitTime" /></th>
                  <th className="px-4 py-3 text-left"><SortHeader label="Strike / Side" k="strike" /></th>
                  <th className="px-4 py-3 text-right">Entry → Exit</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Quantity</th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">Buy/Sell</th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">Order Type</th>
                  <th className="px-4 py-3 text-right hidden xl:table-cell">SL / Target</th>
                  <th className="px-4 py-3 text-right"><SortHeader label="P&L" k="pnlAmount" /></th>
                  <th className="px-4 py-3 text-center">Order Status</th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">Strategy</th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">Broker Order ID</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {pageSlice.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-20 text-center text-sm text-ink-300">
                        No Option Chain trades match your filters.
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
        Only NIFTY Option Chain paper trades are shown here. Connect a broker to execute real orders.
      </p>
    </div>
  );
}
