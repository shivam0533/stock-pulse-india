import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDownUp, ArrowUpRight, ArrowDownRight, Search, X } from 'lucide-react';
import { formatINR, formatIndianNumber, formatPercent } from '@utils/format';
import { cn } from '@utils/cn';
import type { PortfolioHolding } from '@/types';

export interface EnrichedHolding extends PortfolioHolding {
  sector: string;
  color: string;
  allocationPct: number;
}

type SortKey = 'symbol' | 'quantity' | 'avgPrice' | 'currentPrice' | 'invested' | 'currentValue' | 'pnl' | 'pnlPercent' | 'allocationPct';

const COL_HEADERS: { label: string; key: SortKey; align: 'left' | 'right'; hide?: string }[] = [
  { label: 'Stock',          key: 'symbol',       align: 'left'  },
  { label: 'Qty',            key: 'quantity',      align: 'right', hide: 'hidden sm:block' },
  { label: 'Buy Price',      key: 'avgPrice',      align: 'right', hide: 'hidden md:block' },
  { label: 'Current Price',  key: 'currentPrice',  align: 'right', hide: 'hidden md:block' },
  { label: 'Investment',     key: 'invested',      align: 'right', hide: 'hidden lg:block' },
  { label: 'Current Value',  key: 'currentValue',  align: 'right' },
  { label: 'P&L',            key: 'pnl',           align: 'right' },
  { label: 'Alloc',          key: 'allocationPct', align: 'right', hide: 'hidden xl:block' },
];

interface HoldingsTableProps {
  holdings: EnrichedHolding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = holdings;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
  }, [holdings, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const maxAlloc = Math.max(...holdings.map((h) => h.allocationPct), 1);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative flex items-center bg-ink-800 border border-ink-600/60 rounded-xl focus-within:border-brand-400/60 transition-colors">
        <Search size={15} className="ml-3.5 text-ink-300 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search holding…"
          className="flex-1 bg-transparent h-10 px-3 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-ink-600/60 bg-ink-800/40">
        <table className="w-full min-w-[680px] border-collapse">
          <thead className="sticky top-0 z-10 bg-ink-800/95 border-b border-ink-600/40">
            <tr>
              {COL_HEADERS.map(({ label, key, align }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={cn(
                    'px-4 py-3 text-2xs uppercase tracking-wide font-medium text-ink-300 cursor-pointer hover:text-ink-50 transition-colors select-none',
                    align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <ArrowDownUp size={10} className={sortKey === key ? 'text-brand-300' : 'text-ink-600'} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-ink-300">No holdings match.</td>
              </tr>
            ) : (
              filtered.map((h, i) => {
                const pos = h.pnl >= 0;
                const dayPos = h.dayChange >= 0;
                return (
                  <motion.tr
                    key={h.symbol}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    className="group border-b border-ink-600/20 last:border-b-0 hover:bg-ink-700/30 transition-colors"
                  >
                    {/* Stock */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Color dot */}
                        <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                        <Link to={`/stock/${h.symbol}`} className="min-w-0 group/link">
                          <div className="font-display text-sm font-bold text-ink-50 group-hover/link:text-brand-300 transition-colors">
                            {h.symbol}
                          </div>
                          <div className="text-2xs text-ink-300 truncate max-w-[160px]">{h.name}</div>
                          <span className="mt-0.5 inline-flex text-2xs px-1.5 py-0.5 rounded bg-ink-700 text-ink-300 uppercase tracking-wide">
                            {h.sector}
                          </span>
                        </Link>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums hidden sm:table-cell">
                      {h.quantity}
                    </td>

                    {/* Buy Price */}
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink-100 tabular-nums hidden md:table-cell">
                      ₹{formatIndianNumber(h.avgPrice)}
                    </td>

                    {/* Current Price */}
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <div className="font-mono text-sm text-ink-50 tabular-nums">
                        ₹{formatIndianNumber(h.currentPrice)}
                      </div>
                      <div className={cn('flex items-center justify-end gap-0.5 text-2xs font-mono tabular-nums', dayPos ? 'text-gain' : 'text-loss')}>
                        {dayPos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {formatPercent(h.dayChangePercent)}
                      </div>
                    </td>

                    {/* Investment */}
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink-200 tabular-nums hidden lg:table-cell">
                      {formatINR(h.invested, { compact: true })}
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono text-sm font-semibold text-ink-50 tabular-nums">
                        {formatINR(h.currentValue, { compact: true })}
                      </div>
                    </td>

                    {/* P&L */}
                    <td className="px-4 py-3 text-right">
                      <div className={cn('font-mono text-sm font-semibold tabular-nums', pos ? 'text-gain' : 'text-loss')}>
                        {pos ? '+' : ''}{formatINR(h.pnl, { compact: true })}
                      </div>
                      <div className={cn('mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-bold', pos ? 'bg-gain-subtle text-gain' : 'bg-loss-subtle text-loss')}>
                        {pos ? '+' : ''}{formatPercent(h.pnlPercent)}
                      </div>
                    </td>

                    {/* Allocation */}
                    <td className="px-4 py-3 text-right hidden xl:table-cell">
                      <div className="font-mono text-xs text-ink-200 tabular-nums">{h.allocationPct.toFixed(1)}%</div>
                      <div className="mt-1 w-16 h-1.5 rounded-full bg-ink-700 ml-auto overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(h.allocationPct / maxAlloc) * 100}%`,
                            backgroundColor: h.color,
                          }}
                        />
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-2xs text-ink-400 text-right">
        {filtered.length} of {holdings.length} holdings
      </p>
    </div>
  );
}
