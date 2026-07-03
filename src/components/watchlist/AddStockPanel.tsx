import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Modal } from '@components/ui';
import { useStockSearch } from '@hooks/useStockSearch';
import { useWatchlistStore } from '@store/watchlist.store';
import { MOCK_STOCKS } from '@api/mockData';
import { formatIndianNumber, formatPercent } from '@utils/format';
import { cn } from '@utils/cn';

interface AddStockPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AddStockPanel({ open, onClose }: AddStockPanelProps) {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useStockSearch(query);
  const { has, add } = useWatchlistStore();
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  // Show popular stocks when no query
  const displayList = query.trim() ? (results ?? []) : MOCK_STOCKS.slice(0, 10);

  const handleAdd = (s: typeof MOCK_STOCKS[number]) => {
    add({ symbol: s.symbol, name: s.name, exchange: s.exchange, sector: s.sector });
    setJustAdded((prev) => new Set(prev).add(s.symbol));
    setTimeout(() => {
      setJustAdded((prev) => { const n = new Set(prev); n.delete(s.symbol); return n; });
    }, 1500);
  };

  const handleClose = () => { setQuery(''); setJustAdded(new Set()); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Add to Watchlist" size="md">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative flex items-center bg-ink-900 border border-ink-600 rounded-xl focus-within:border-brand-400/60 transition-colors">
          <Search size={15} className="ml-3.5 text-ink-300 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or company name…"
            autoFocus
            className="flex-1 bg-transparent h-11 px-3 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
              <X size={14} />
            </button>
          )}
        </div>

        {!query.trim() && (
          <p className="text-2xs text-ink-400 uppercase tracking-wide">Popular stocks</p>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto -mx-1 px-1 space-y-0.5">
          {isLoading && query && (
            <div className="py-8 text-center text-sm text-ink-300">Searching…</div>
          )}
          {!isLoading && query && (results?.length === 0) && (
            <div className="py-8 text-center text-sm text-ink-300">
              No stocks match "<span className="text-ink-100">{query}</span>"
            </div>
          )}
          <AnimatePresence>
            {displayList.map((s) => {
              const alreadyIn = has(s.symbol);
              const added = justAdded.has(s.symbol);
              const up = s.changePercent >= 0;
              return (
                <motion.div
                  key={s.symbol}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    alreadyIn ? 'opacity-60 cursor-not-allowed' : 'hover:bg-ink-700/40 cursor-pointer',
                  )}
                  onClick={() => !alreadyIn && handleAdd(s as typeof MOCK_STOCKS[number])}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-ink-50">{s.symbol}</span>
                      <span className="text-2xs text-ink-300 px-1.5 py-0.5 rounded bg-ink-700 uppercase">{s.exchange}</span>
                      <span className="hidden sm:inline text-2xs text-ink-400">{s.sector}</span>
                    </div>
                    <div className="text-xs text-ink-300 truncate max-w-[220px]">{s.name}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-sm text-ink-50 tabular-nums">₹{formatIndianNumber(s.price)}</div>
                      <div className={cn('text-2xs font-mono tabular-nums flex items-center justify-end gap-0.5', up ? 'text-gain' : 'text-loss')}>
                        {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {formatPercent(s.changePercent)}
                      </div>
                    </div>
                    {added ? (
                      <CheckCircle2 size={18} className="text-gain shrink-0" />
                    ) : alreadyIn ? (
                      <span className="text-2xs text-ink-300 px-2 py-0.5 rounded bg-ink-700 shrink-0">Added</span>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-400/15 text-brand-300 hover:bg-brand-400/25 transition-colors shrink-0">
                        <Plus size={14} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}
