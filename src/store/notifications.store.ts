import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@utils/constants';
import type { AppNotification } from '@/types';

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'ntf1',
    type: 'price-alert',
    title: 'RELIANCE crossed your target',
    message: 'Reliance Industries is now trading at ₹2,843.50, above your alert of ₹2,800.',
    timestamp: Date.now() - 1000 * 60 * 18,
    read: false,
    link: '/stock/RELIANCE',
  },
  {
    id: 'ntf2',
    type: 'order',
    title: 'Order filled: TCS',
    message: 'Your sell order for 15 shares of TCS was executed at ₹4,156.20.',
    timestamp: Date.now() - 1000 * 60 * 52,
    read: false,
    link: '/portfolio',
  },
  {
    id: 'ntf3',
    type: 'news',
    title: 'RBI keeps repo rate unchanged',
    message: 'The Reserve Bank of India maintained the status quo on policy rates for the eighth consecutive meeting.',
    timestamp: Date.now() - 1000 * 60 * 90,
    read: false,
    link: '/news',
  },
  {
    id: 'ntf4',
    type: 'order',
    title: 'Order partially filled: SUNPHARMA',
    message: '25 of 60 shares filled at ₹1,728.00. Remaining quantity stays open.',
    timestamp: Date.now() - 1000 * 60 * 150,
    read: true,
    link: '/portfolio',
  },
  {
    id: 'ntf5',
    type: 'price-alert',
    title: 'INFY approaching resistance',
    message: 'Infosys is up 1.27% today and nearing its 52-week high.',
    timestamp: Date.now() - 1000 * 60 * 240,
    read: true,
    link: '/stock/INFY',
  },
  {
    id: 'ntf6',
    type: 'system',
    title: 'Welcome to Stock Pulse India',
    message: 'Your account is verified and ready. Explore the dashboard to track your portfolio.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
  },
];

interface NotificationsState {
  items: AppNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: SEED_NOTIFICATIONS,
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
