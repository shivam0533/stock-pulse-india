import { create } from 'zustand';

export type BrokerToastKind = 'success' | 'error';

export interface BrokerToast {
  id: string;
  kind: BrokerToastKind;
  message: string;
}

const TOAST_LIFETIME_MS = 4000;

interface BrokerToastState {
  toasts: BrokerToast[];
  push: (kind: BrokerToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

/** Toast notifications scoped to the Broker Integration page only. */
export const useBrokerToastStore = create<BrokerToastState>()((set, get) => ({
  toasts: [],

  push: (kind, message) => {
    const id = `broker-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    setTimeout(() => get().dismiss(id), TOAST_LIFETIME_MS);
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
