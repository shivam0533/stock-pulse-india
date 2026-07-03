import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Search, SlidersHorizontal, Star, Trash2, X } from 'lucide-react';
import { Button } from '@components/ui';
import { WatchlistCard } from '@components/watchlist/WatchlistCard';
import { AddStockPanel } from '@components/watchlist/AddStockPanel';
import { PriceAlertModal } from '@components/watchlist/PriceAlertModal';
import { useWatchlistStore } from '@store/watchlist.store';
import { MOCK_STOCKS } from '@api/mockData';
import { cn } from '@utils/cn';

// ── Seeded price drift ────────────────────────────────────────────────────────
function nextPrice(price: number, seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5;
  const r = (x - Math.floor(x)) - 0.5; // -0.5 to +0.5
  return Math.round((price * (1 + r * 0.004)) * 100) / 100;
}

// ── Default stocks to pre-load for demo ──────────────────────────────────────
const DEMO_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'BAJFINANCE', 'TITAN', 'SUNPHARMA'];

export default function Watchlist() {
  const store = useWatchlistStore();
  const { items, add, remove, toggleFavourite, setAlert, clearAlert, triggerAlert } = store;

  // ── Pre-load demo stocks if empty ─────────────────────────────────────────
  useEffect(() => {
    if (items.length === 0) {
      DEMO_SYMBOLS.forEach((sym) => {
        const s = MOCK_STOCKS.find((m) => m.symbol === sym);
        if (s) add({ symbol: s.symbol, name: s.name, exchange: s.exchange, sector: s.sector });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live price simulation ─────────────────────────────────────────────────
  const [livePrices, setLivePrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_STOCKS.map((s) => [s.symbol, s.price]))
  );
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_STOCKS.map((s) => [s.symbol, s.price]))
  );
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;
      setLivePrices((prev) => {
        const next = { ...prev };
        MOCK_STOCKS.forEach((s) => {
          next[s.symbol] = nextPrice(prev[s.symbol], tick * 997 + s.symbol.length * 31);
        });
        return next;
      });
      setPrevPrices((prev) => ({ ...prev }));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Check alert triggers on price update
  useEffect(() => {
    items.forEach((item) => {
      if (!item.priceAlert || item.priceAlert.triggered) return;
      const price = livePrices[item.symbol];
      if (!price) return;
      const { direction, price: target } = item.priceAlert;
      if ((direction === 'above' && price >= target) || (direction === 'below' && price <= target)) {
        triggerAlert(item.symbol);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrices]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd]         = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy]           = useState<'name' | 'change' | 'price' | 'added'>('added');
  const [filterFav, setFilterFav]     = useState(false);
  const [filterAlert, setFilterAlert] = useState(false);
  const [alertFor, setAlertFor]       = useState<string | null>(null);

  const alertStock = alertFor ? MOCK_STOCKS.find((s) => s.symbol === alertFor) : null;
  const alertItem  = alertFor ? items.find((i) => i.symbol === alertFor) : null;

  const stockMap = useMemo(() =>
    Object.fromEntries(MOCK_STOCKS.map((s) => [s.symbol, s])),
  []);

  const visible = useMemo(() => {
    let result = items
      .map((w) => ({ w, stock: stockMap[w.symbol] }))
      .filter(({ stock }) => !!stock);

    if (searchQuery)  result = result.filter(({ w }) =>
      w.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterFav)    result = result.filter(({ w }) => w.isFavourite);
    if (filterAlert)  result = result.filter(({ w }) => !!w.priceAlert);

    result.sort((a, b) => {
      if (sortBy === 'name')   return a.w.symbol.localeCompare(b.w.symbol);
      if (sortBy === 'price')  return (livePrices[b.w.symbol] ?? 0) - (livePrices[a.w.symbol] ?? 0);
      if (sortBy === 'change') {
        const ca = ((livePrices[a.w.symbol] ?? a.stock.price) - a.stock.previousClose) / a.stock.previousClose;
        const cb = ((livePrices[b.w.symbol] ?? b.stock.price) - b.stock.previousClose) / b.stock.previousClose;
        return cb - ca;
      }
      return b.w.addedAt - a.w.addedAt;
    });

    // Favourites always on top
    const fav  = result.filter(({ w }) => w.isFavourite);
    const rest = result.filter(({ w }) => !w.isFavourite);
    return [...fav, ...rest];
  }, [items, stockMap, searchQuery, filterFav, filterAlert, sortBy, livePrices]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = items.map((w) => {
      const s = stockMap[w.symbol];
      if (!s) return null;
      const live = livePrices[w.symbol] ?? s.price;
      return { change: live - s.previousClose };
    }).filter(Boolean) as { change: number }[];

    return {
      total:     items.length,
      gainers:   active.filter((a) => a.change > 0).length,
      losers:    active.filter((a) => a.change < 0).length,
      alerts:    items.filter((w) => !!w.priceAlert).length,
      favourites:items.filter((w) => w.isFavourite).length,
    };
  }, [items, stockMap, livePrices]);

  const handleAlertSave = useCallback((alert: { price: number; direction: 'above' | 'below' }) => {
    if (alertFor) setAlert(alertFor, alert);
  }, [alertFor, setAlert]);

  const handleAlertClear = useCallback(() => {
    if (alertFor) clearAlert(alertFor);
  }, [alertFor, clearAlert]);

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
            <Star size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              Watchlist
            </h1>
            <p className="text-sm text-ink-200 mt-0.5">
              {items.length} stocks · Live prices update every 3s
            </p>
          </div>
        </div>
        <Button
          leftIcon={<Plus size={14} />}
          onClick={() => setShowAdd(true)}
          size="sm"
        >
          Add Stock
        </Button>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-5 gap-2"
      >
        {[
          { label: 'Total',      value: stats.total,      color: 'text-ink-50'  },
          { label: 'Gainers',    value: stats.gainers,    color: 'text-gain'    },
          { label: 'Losers',     value: stats.losers,     color: 'text-loss'    },
          { label: 'Alerts',     value: stats.alerts,     color: 'text-brand-300' },
          { label: 'Favourites', value: stats.favourites, color: 'text-brand-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-ink-800/60 border border-ink-600/60 rounded-xl px-3 py-2.5 text-center">
            <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
            <div className={cn('font-mono text-xl font-bold tabular-nums mt-0.5', color)}>{value}</div>
          </div>
        ))}
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-wrap gap-2 items-center"
      >
        {/* Search watchlist */}
        <div className="relative flex items-center bg-ink-800 border border-ink-600/60 rounded-xl focus-within:border-brand-400/60 transition-colors flex-1 min-w-[200px]">
          <Search size={14} className="ml-3 text-ink-300 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watchlist…"
            className="flex-1 bg-transparent h-10 px-2.5 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
              <X size={13} />
            </button>
          )}
        </div>

        <SlidersHorizontal size={14} className="text-ink-400" />

        {/* Sort */}
        <div className="flex bg-ink-800 border border-ink-600/60 rounded-xl p-0.5 gap-0.5">
          {([['added', 'Recent'], ['name', 'A–Z'], ['change', 'Change'], ['price', 'Price']] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortBy(k)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                sortBy === k ? 'bg-brand-400/20 text-brand-300' : 'text-ink-300 hover:text-ink-100',
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Favourite filter */}
        <button
          type="button"
          onClick={() => setFilterFav((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
            filterFav
              ? 'bg-brand-400/15 text-brand-300 border-brand-400/30'
              : 'bg-ink-800 text-ink-300 border-ink-600/60 hover:border-ink-500',
          )}
        >
          <Star size={13} fill={filterFav ? 'currentColor' : 'none'} />
          Favourites
        </button>

        {/* Alert filter */}
        <button
          type="button"
          onClick={() => setFilterAlert((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
            filterAlert
              ? 'bg-brand-400/15 text-brand-300 border-brand-400/30'
              : 'bg-ink-800 text-ink-300 border-ink-600/60 hover:border-ink-500',
          )}
        >
          <Bell size={13} />
          Alerts
        </button>

        {/* Clear all */}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => store.clear()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs text-loss border-loss/30 bg-loss-subtle hover:bg-loss/20 transition-colors ml-auto"
          >
            <Trash2 size={12} /> Clear all
          </button>
        )}
      </motion.div>

      {/* Cards grid */}
      {visible.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-ink-800 border border-ink-600 flex items-center justify-center mx-auto mb-4">
            <Star size={28} className="text-ink-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-100">
            {items.length === 0 ? 'Nothing tracked yet' : 'No stocks match your filters'}
          </h3>
          <p className="mt-2 text-sm text-ink-300 max-w-xs">
            {items.length === 0
              ? 'Click "Add Stock" to start tracking companies you care about.'
              : 'Try clearing your filters or adding more stocks.'}
          </p>
          {items.length === 0 && (
            <Button className="mt-5" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>
              Add your first stock
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {visible.map(({ w, stock }) => (
              <WatchlistCard
                key={w.symbol}
                item={w}
                stock={stock}
                livePrice={livePrices[w.symbol] ?? stock.price}
                prevPrice={prevPrices[w.symbol] ?? stock.price}
                onRemove={() => remove(w.symbol)}
                onToggleFav={() => toggleFavourite(w.symbol)}
                onAlertClick={() => setAlertFor(w.symbol)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AddStockPanel open={showAdd} onClose={() => setShowAdd(false)} />

      {alertFor && alertStock && (
        <PriceAlertModal
          open
          symbol={alertFor}
          currentPrice={livePrices[alertFor] ?? alertStock.price}
          existing={alertItem?.priceAlert}
          onSave={handleAlertSave}
          onClear={handleAlertClear}
          onClose={() => setAlertFor(null)}
        />
      )}
    </div>
  );
}
