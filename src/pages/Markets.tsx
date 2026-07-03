import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp } from 'lucide-react';
import { Card, Skeleton } from '@components/ui';
import { StockRow } from '@components/stocks/StockRow';
import { useStocks } from '@hooks/useStocks';
import { cn } from '@utils/cn';
import type { Sector, Stock } from '@/types';

type SortKey = 'name' | 'price' | 'change' | 'volume' | 'mcap';
type SortDir = 'asc' | 'desc';

const SECTORS: ('All' | Sector)[] = [
  'All', 'Banking', 'IT', 'Energy', 'FMCG', 'Pharma', 'Auto', 'Metals', 'Telecom', 'Infrastructure',
];

export default function Markets() {
  const { data: stocks, isLoading } = useStocks();
  const [sector, setSector] = useState<'All' | Sector>('All');
  const [sortKey, setSortKey] = useState<SortKey>('mcap');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    let result: Stock[] = stocks ?? [];
    if (sector !== 'All') {
      result = result.filter((s) => s.sector === sector);
    }
    result = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'price': return (a.price - b.price) * dir;
        case 'change': return (a.changePercent - b.changePercent) * dir;
        case 'volume': return (a.volume - b.volume) * dir;
        case 'mcap': return (a.marketCap - b.marketCap) * dir;
        default: return 0;
      }
    });
    return result;
  }, [stocks, sector, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
          Markets
        </h1>
        <p className="mt-1 text-sm text-ink-200">
          Browse {stocks?.length ?? 0} stocks across NSE and BSE.
        </p>
      </motion.div>

      {/* Sector filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {SECTORS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSector(s)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
              sector === s
                ? 'bg-brand-400/15 text-brand-300 border-brand-400/40'
                : 'bg-ink-800 text-ink-200 border-ink-600 hover:border-ink-500 hover:text-ink-50'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        {/* Sort header */}
        <div className="hidden md:grid grid-cols-[28px_1fr_96px_96px_112px_112px] gap-3 px-4 py-2.5 border-b border-ink-600/40 text-2xs uppercase tracking-wide text-ink-300">
          <div />
          <button
            onClick={() => handleSort('name')}
            className="flex items-center gap-1 text-left hover:text-ink-50 transition-colors"
          >
            Stock <ArrowDownUp size={10} />
          </button>
          <div className="hidden md:block">Sector</div>
          <button
            onClick={() => handleSort('volume')}
            className="hidden lg:flex items-center gap-1 justify-end hover:text-ink-50 transition-colors"
          >
            Volume <ArrowDownUp size={10} />
          </button>
          <button
            onClick={() => handleSort('mcap')}
            className="hidden lg:flex items-center gap-1 justify-end hover:text-ink-50 transition-colors"
          >
            Market Cap <ArrowDownUp size={10} />
          </button>
          <button
            onClick={() => handleSort('price')}
            className="flex items-center gap-1 justify-end hover:text-ink-50 transition-colors"
          >
            Price <ArrowDownUp size={10} />
          </button>
        </div>

        <div>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-ink-600/30 last:border-b-0 flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1.5" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            : filtered.map((stock) => <StockRow key={stock.symbol} stock={stock} />)}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-ink-200">
            No stocks match the selected filters.
          </div>
        )}
      </Card>
    </div>
  );
}
