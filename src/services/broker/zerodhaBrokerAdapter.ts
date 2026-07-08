import type { BrokerAdapter } from './broker.types';

/**
 * Stub adapter — real Kite Connect OAuth + order placement plugs in here.
 * Until a session token is wired up, isAuthenticated() stays false so no
 * live orders can ever be placed through this adapter.
 */
export const zerodhaBrokerAdapter: BrokerAdapter = {
  id: 'ZERODHA',
  label: 'Zerodha Kite Connect',

  isAuthenticated: () => false,

  placeOrder: async () => {
    throw new Error('Zerodha is not connected. Complete broker authentication before placing live orders.');
  },
};
