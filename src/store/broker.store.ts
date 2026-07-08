import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BrokerId } from '@services/broker/broker.types';

interface BrokerState {
  activeBroker: BrokerId;
  setActiveBroker: (id: BrokerId) => void;
}

export const useBrokerStore = create<BrokerState>()(
  persist(
    (set) => ({
      activeBroker: 'PAPER',
      setActiveBroker: (id) => set({ activeBroker: id }),
    }),
    { name: 'broker-store' },
  ),
);
