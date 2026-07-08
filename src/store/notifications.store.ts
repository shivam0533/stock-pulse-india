import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, ROUTES } from '@utils/constants';
import type { AppNotification } from '@/types';

/**
 * All notifications are generated only from Option Chain / AI Signals /
 * Trading / Risk Management events — no individual-stock alerts. Reuses the
 * existing 4 notification types (price-alert/order/news/system) unchanged
 * so the drawer's icon/color mapping in NotificationsMenu.tsx needs no
 * changes: price-alert = AI signals & OI/volume alerts, order = trade
 * lifecycle events, system = market session status.
 */
const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'ntf1',
    type: 'price-alert',
    title: '🟢 AI BUY Signal',
    message: 'NIFTY 24950 CE — AI Confidence: 92%',
    timestamp: Date.now() - 1000 * 60 * 4,
    read: false,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf2',
    type: 'order',
    title: '🟢 Trade Executed',
    message: 'Bought 5 Lots of NIFTY 24950 CE — Entry: ₹26.11',
    timestamp: Date.now() - 1000 * 60 * 6,
    read: false,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf3',
    type: 'price-alert',
    title: '📈 High OI Build-up',
    message: 'NIFTY 25000 CE — Call Open Interest increased by 18%.',
    timestamp: Date.now() - 1000 * 60 * 22,
    read: false,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf4',
    type: 'order',
    title: '🎯 Target Hit',
    message: 'NIFTY 24950 CE — Profit: +₹594 (+7%)',
    timestamp: Date.now() - 1000 * 60 * 45,
    read: false,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf5',
    type: 'price-alert',
    title: '📉 Put OI Build-up',
    message: 'NIFTY 24850 PE — Put Open Interest increased by 21%.',
    timestamp: Date.now() - 1000 * 60 * 70,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf6',
    type: 'order',
    title: '🔴 Stop Loss Hit',
    message: 'Trade closed. Loss: ₹255 (-3%)',
    timestamp: Date.now() - 1000 * 60 * 95,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf7',
    type: 'order',
    title: '🟠 Trailing Stop Exit',
    message: 'Profit protected. P&L: +₹484',
    timestamp: Date.now() - 1000 * 60 * 130,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf8',
    type: 'order',
    title: '🔵 AI Reversal Exit',
    message: 'Trend changed. Trade closed by AI.',
    timestamp: Date.now() - 1000 * 60 * 160,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf9',
    type: 'price-alert',
    title: '⚡ Unusual Volume',
    message: 'NIFTY 24950 CE volume increased by 3.2x.',
    timestamp: Date.now() - 1000 * 60 * 200,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf10',
    type: 'system',
    title: '🔔 Market Open',
    message: 'NIFTY Option Chain is now active.',
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
  {
    id: 'ntf11',
    type: 'system',
    title: '🔕 Market Closed',
    message: 'Trading session has ended.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
    link: ROUTES.OPTION_CHAIN,
  },
];

const MAX_NOTIFICATIONS = 100;

interface NotificationsState {
  items: AppNotification[];
  /** Prepends a new, unread, live-generated notification and caps the list at MAX_NOTIFICATIONS. */
  push: (input: Pick<AppNotification, 'type' | 'title' | 'message'> & Partial<Pick<AppNotification, 'link'>>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      // SEED_NOTIFICATIONS is only ever the initial fallback shown before any
      // real Option Chain / AI Signals / Trading / Risk Management activity
      // has occurred this session — every notification after that is
      // generated live via push() below.
      items: SEED_NOTIFICATIONS,
      push: ({ type, title, message, link }) => {
        const notification: AppNotification = {
          id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          title,
          message,
          timestamp: Date.now(),
          read: false,
          link,
        };
        set({ items: [notification, ...get().items].slice(0, MAX_NOTIFICATIONS) });
      },
      markAsRead: (id) =>
        set({ items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
      markAllAsRead: () => set({ items: get().items.map((n) => ({ ...n, read: true })) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEYS.NOTIFICATIONS,
    }
  )
);
