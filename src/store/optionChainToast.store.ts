import { create } from 'zustand';

export type OptionToastKind = 'opened' | 'closed' | 'stop-loss' | 'target' | 'square-off' | 'rejected';

export interface OptionToast {
  id: string;
  kind: OptionToastKind;
  message: string;
}

const TOAST_LIFETIME_MS = 3500;

interface OptionChainToastState {
  toasts: OptionToast[];
  push: (kind: OptionToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

/**
 * Toast notifications scoped to the NIFTY Option Chain page only. Not
 * persisted, not shared with the app's global notification bell.
 */
export const useOptionChainToastStore = create<OptionChainToastState>()((set, get) => ({
  toasts: [],

  push: (kind, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    setTimeout(() => get().dismiss(id), TOAST_LIFETIME_MS);
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
