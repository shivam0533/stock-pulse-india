import type { BrokerAdapter } from './broker.types';

export const paperBrokerAdapter: BrokerAdapter = {
  id: 'PAPER',
  label: 'Paper Trading (Simulated)',

  isAuthenticated: () => true,

  placeOrder: async (req) => ({
    filledPrice: req.price,
    brokerOrderId: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }),

  // No real position exists for Paper Trading, so there's nothing to close
  // on a broker — the exit is entirely simulated, same as placeOrder above.
  exitOrder: async () => ({
    filledPrice: 0,
    brokerOrderId: `paper-exit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }),
};
