import { create } from 'zustand';

/**
 * Read-only status readout for the Auto Trading Engine (useAutoTradingEngine).
 * Ephemeral/non-persisted by design — always re-derived at runtime, never a
 * source of truth for trading decisions. Nothing outside the engine itself
 * should call `set`.
 */
export type AutoTradingStatus =
  | 'IDLE'
  | 'WAITING_FOR_SIGNAL'
  | 'SIGNAL_FOUND'
  | 'ORDER_PLACED'
  | 'POSITION_ACTIVE'
  | 'TARGET_HIT'
  | 'STOP_LOSS_HIT';

export const AUTO_TRADING_STATUS_LABEL: Record<AutoTradingStatus, string> = {
  IDLE: 'Auto Trading Off',
  WAITING_FOR_SIGNAL: 'Waiting for Signal',
  SIGNAL_FOUND: 'Signal Found',
  ORDER_PLACED: 'Order Placed',
  POSITION_ACTIVE: 'Position Active',
  TARGET_HIT: 'Target Hit',
  STOP_LOSS_HIT: 'Stop Loss Hit',
};

interface AutoTradingStatusState {
  status: AutoTradingStatus;
  message: string;
  updatedAt: number;
  set: (status: AutoTradingStatus, message?: string) => void;
}

export const useAutoTradingStatusStore = create<AutoTradingStatusState>()((set, get) => ({
  status: 'IDLE',
  message: '',
  updatedAt: Date.now(),
  set: (status, message = '') => {
    if (get().status === status && get().message === message) return;
    set({ status, message, updatedAt: Date.now() });
  },
}));
