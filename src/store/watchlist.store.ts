import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@utils/constants';
import type { WatchlistItem, PriceAlert } from '@/types';

interface WatchlistState {
  items: WatchlistItem[];
  add: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  remove: (symbol: string) => void;
  toggle: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  has: (symbol: string) => boolean;
  clear: () => void;
  // New actions
  toggleFavourite: (symbol: string) => void;
  setAlert: (symbol: string, alert: Omit<PriceAlert, 'triggered'>) => void;
  clearAlert: (symbol: string) => void;
  triggerAlert: (symbol: string) => void;
}

function patch(items: WatchlistItem[], symbol: string, update: Partial<WatchlistItem>): WatchlistItem[] {
  return items.map((i) => (i.symbol === symbol ? { ...i, ...update } : i));
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.some((i) => i.symbol === item.symbol)) return;
        set({ items: [...get().items, { ...item, addedAt: Date.now() }] });
      },
      remove: (symbol) =>
        set({ items: get().items.filter((i) => i.symbol !== symbol) }),
      toggle: (item) => {
        const existing = get().items.find((i) => i.symbol === item.symbol);
        if (existing) get().remove(item.symbol);
        else get().add(item);
      },
      has: (symbol) => get().items.some((i) => i.symbol === symbol),
      clear: () => set({ items: [] }),
      toggleFavourite: (symbol) =>
        set({ items: patch(get().items, symbol, { isFavourite: !get().items.find((i) => i.symbol === symbol)?.isFavourite }) }),
      setAlert: (symbol, alert) =>
        set({ items: patch(get().items, symbol, { priceAlert: { ...alert, triggered: false } }) }),
      clearAlert: (symbol) =>
        set({ items: patch(get().items, symbol, { priceAlert: null }) }),
      triggerAlert: (symbol) => {
        const item = get().items.find((i) => i.symbol === symbol);
        if (item?.priceAlert && !item.priceAlert.triggered)
          set({ items: patch(get().items, symbol, { priceAlert: { ...item.priceAlert, triggered: true } }) });
      },
    }),
    {
      name: STORAGE_KEYS.WATCHLIST,
    }
  )
);
