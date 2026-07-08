import type { BrokerAdapter } from './broker.types';

export const paperBrokerAdapter: BrokerAdapter = {
  id: 'PAPER',
  label: 'Paper Trading (Simulated)',

  isAuthenticated: () => true,

  placeOrder: async (req) => ({
    filledPrice: req.price,
    brokerOrderId: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }),
};
