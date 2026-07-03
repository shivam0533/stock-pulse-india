import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, TrendingDown, Command } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStockSearch } from '@hooks/useStockSearch';
import { formatIndianNumber, formatPercent } from '@utils/format';
import { cn } from '@utils/cn';

interface SearchBarProps {
  className?: string;
  variant?: 'navbar' | 'modal';
  onResultClick?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({ className, variant = 'navbar', onResultClick, autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useStockSearch(query);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = containerRef.current?.querySelector('input');
        input?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Optionally focus immediately on mount (e.g. mobile search overlay)
  useEffect(() => {
    if (autoFocus) containerRef.current?.querySelector('input')?.focus();
  }, [autoFocus]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const visibleResults = results ?? [];

  const handleSelect = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setQuery('');
    setOpen(false);
    onResultClick?.();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && visibleResults[activeIndex]) {
      handleSelect(visibleResults[activeIndex].symbol);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center bg-ink-800 border border-ink-600 rounded-xl transition-colors',
          'focus-within:border-brand-400/60 focus-within:bg-ink-800',
          variant === 'modal' && 'h-12'
        )}
      >
        <Search size={16} className="ml-3.5 text-ink-300 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search stocks, indices…"
          className={cn(
            'flex-1 bg-transparent text-sm text-ink-50 placeholder:text-ink-300 outline-none',
            'h-10 px-3'
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveIndex(0);
            }}
            className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50 hover:bg-ink-700"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : (
          variant === 'navbar' && (
            <kbd className="hidden md:flex mr-2 items-center gap-0.5 px-1.5 h-5 text-2xs font-mono text-ink-300 bg-ink-700 border border-ink-600 rounded">
              <Command size={10} />K
            </kbd>
          )
        )}
      </div>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 w-full bg-ink-800 border border-ink-600 rounded-xl shadow-2xl overflow-hidden z-40"
          >
            {isLoading && (
              <div className="px-4 py-6 text-sm text-ink-300 text-center">Searching…</div>
            )}
            {!isLoading && visibleResults.length === 0 && (
              <div className="px-4 py-6 text-sm text-ink-300 text-center">
                No stocks match "<span className="text-ink-100">{query}</span>"
              </div>
            )}
            {!isLoading && visibleResults.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1">
                {visibleResults.map((stock, idx) => {
                  const isUp = stock.change >= 0;
                  return (
                    <li key={stock.symbol}>
                      <button
                        type="button"
                        onClick={() => handleSelect(stock.symbol)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                          idx === activeIndex ? 'bg-ink-700' : 'hover:bg-ink-700/60'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-semibold text-ink-50">
                              {stock.symbol}
                            </span>
                            <span className="text-2xs text-ink-300 uppercase tracking-wide">
                              {stock.exchange}
                            </span>
                          </div>
                          <div className="text-xs text-ink-200 truncate">{stock.name}</div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="font-mono text-sm text-ink-50 tabular-nums">
                            ₹{formatIndianNumber(stock.price)}
                          </div>
                          <div
                            className={cn(
                              'flex items-center justify-end gap-0.5 text-2xs font-medium tabular-nums',
                              isUp ? 'text-gain' : 'text-loss'
                            )}
                          >
                            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {formatPercent(stock.changePercent)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
