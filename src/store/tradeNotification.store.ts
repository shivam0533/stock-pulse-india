import { create } from 'zustand';
import type { OptionSide } from '@/types';

export type TradeNotificationKind =
  | 'BUY'
  | 'TARGET'
  | 'STOP_LOSS'
  | 'TRAILING_STOP'
  | 'AI_REVERSAL'
  | 'MANUAL_EXIT';

export interface TradeNotification {
  id: string;
  kind: TradeNotificationKind;
  strike: number;
  side: OptionSide;
  lots: number;
  quantity: number;
  /** Entry price for a BUY notification, exit price for every exit kind. */
  price: number;
  /** Only present for exit kinds. */
  pnlAmount?: number;
  pnlPercent?: number;
  time: number;
}

const NOTIFICATION_LIFETIME_MS = 5000;

interface TradeNotificationState {
  notifications: TradeNotification[];
  push: (n: Omit<TradeNotification, 'id'>) => void;
  dismiss: (id: string) => void;
}

/**
 * Rich Trade Popup Notification feed — global, app-wide (mounted once in
 * AppLayout so it fires regardless of which page is open, for both Paper
 * and Live trading). Fully separate from useOptionChainToastStore (the
 * existing lightweight one-line toast scoped to the Option Chain page) —
 * this is an additive, distinct notification surface, not a replacement.
 */
export const useTradeNotificationStore = create<TradeNotificationState>()((set, get) => ({
  notifications: [],

  push: (n) => {
    const id = `trade-notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ notifications: [...get().notifications, { ...n, id }] });
    setTimeout(() => get().dismiss(id), NOTIFICATION_LIFETIME_MS);
  },

  dismiss: (id) => set({ notifications: get().notifications.filter((n) => n.id !== id) }),
}));
