import type { BrokerAdapter } from './broker.types';

/**
 * Stub adapter — real Shoonya (Finvasia) OAuth + order placement plugs in
 * here. Until a session token is wired up, isAuthenticated() stays false so
 * no live orders can ever be placed through this adapter.
 */
export const shoonyaBrokerAdapter: BrokerAdapter = {
  id: 'SHOONYA',
  label: 'Shoonya',

  isAuthenticated: () => false,

  placeOrder: async () => {
    throw new Error('Shoonya is not connected. Complete broker authentication before placing live orders.');
  },

  exitOrder: async () => {
    throw new Error('Shoonya is not connected. Complete broker authentication before exiting a live position.');
  },
};
