import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BrokerId } from '@services/broker/broker.types';

/**
 * Global, persisted broker CONNECTION status — shown on the Broker
 * Integration page. Deliberately separate from broker.store.ts's
 * `activeBroker` (which governs live order routing): connecting here is a
 * mock/demo session only, so it must never silently make Option Chain
 * trading treat the broker as authenticated for real orders.
 *
 * Persisted via zustand's `persist` middleware (localStorage), so a saved
 * session automatically survives a page refresh — components just read
 * `connections` reactively. Expiry is a plain timestamp checked by
 * `useBrokerSessionMonitor`, which clears any session whose time has passed.
 */
export interface BrokerConnectionInfo {
  clientName: string;
  clientCode: string;
  brokerName: string;
  connectedAt: number; // epoch ms
  sessionExpiresAt: number; // epoch ms — after this, the session is auto-logged-out
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

interface BrokerConnectionState {
  connections: Partial<Record<BrokerId, BrokerConnectionInfo>>;
  setConnected: (brokerId: BrokerId, info: BrokerConnectionInfo) => void;
  setDisconnected: (brokerId: BrokerId) => void;
}

export const useBrokerConnectionStore = create<BrokerConnectionState>()(
  persist(
    (set) => ({
      connections: {},

      setConnected: (brokerId, info) =>
        set((state) => ({ connections: { ...state.connections, [brokerId]: info } })),

      setDisconnected: (brokerId) =>
        set((state) => {
          const next = { ...state.connections };
          delete next[brokerId];
          return { connections: next };
        }),
    }),
    { name: 'broker-connection-store' },
  ),
);
