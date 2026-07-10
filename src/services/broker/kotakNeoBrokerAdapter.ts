import type { BrokerAdapter } from './broker.types';

/**
 * Stub adapter — real Kotak Neo (Kotak Securities API) OAuth + order
 * placement plugs in here. Until a session token is wired up,
 * isAuthenticated() stays false so no live orders can ever be placed
 * through this adapter.
 */
export const kotakNeoBrokerAdapter: BrokerAdapter = {
  id: 'KOTAK_NEO',
  label: 'Kotak Neo',

  isAuthenticated: () => false,

  placeOrder: async () => {
    throw new Error('Kotak Neo is not connected. Complete broker authentication before placing live orders.');
  },

  exitOrder: async () => {
    throw new Error('Kotak Neo is not connected. Complete broker authentication before exiting a live position.');
  },
};
