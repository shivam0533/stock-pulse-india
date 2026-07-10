import type { BrokerAdapter } from './broker.types';

/**
 * Stub adapter — real Upstox OAuth + order placement plugs in here.
 * Until a session token is wired up, isAuthenticated() stays false so no
 * live orders can ever be placed through this adapter.
 */
export const upstoxBrokerAdapter: BrokerAdapter = {
  id: 'UPSTOX',
  label: 'Upstox',

  isAuthenticated: () => false,

  placeOrder: async () => {
    throw new Error('Upstox is not connected. Complete broker authentication before placing live orders.');
  },

  exitOrder: async () => {
    throw new Error('Upstox is not connected. Complete broker authentication before exiting a live position.');
  },
};
