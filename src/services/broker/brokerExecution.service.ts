import { useBrokerStore } from '@store/broker.store';
import { paperBrokerAdapter } from './paperBrokerAdapter';
import { zerodhaBrokerAdapter } from './zerodhaBrokerAdapter';
import { angelOneBrokerAdapter } from './angelOneBrokerAdapter';
import { upstoxBrokerAdapter } from './upstoxBrokerAdapter';
import { shoonyaBrokerAdapter } from './shoonyaBrokerAdapter';
import { kotakNeoBrokerAdapter } from './kotakNeoBrokerAdapter';
import type { BrokerAdapter, BrokerId, BrokerOrderRequest, BrokerOrderResult } from './broker.types';

const ADAPTERS: Record<BrokerId, BrokerAdapter> = {
  PAPER: paperBrokerAdapter,
  ZERODHA: zerodhaBrokerAdapter,
  ANGEL_ONE: angelOneBrokerAdapter,
  UPSTOX: upstoxBrokerAdapter,
  SHOONYA: shoonyaBrokerAdapter,
  KOTAK_NEO: kotakNeoBrokerAdapter,
};

export function getActiveBrokerAdapter(): BrokerAdapter {
  return ADAPTERS[useBrokerStore.getState().activeBroker];
}

/** Places an option order through the active broker adapter. Throws if the broker isn't authenticated. Async — a real adapter makes a genuine network call. */
export async function placeOptionOrder(req: BrokerOrderRequest): Promise<BrokerOrderResult> {
  const adapter = getActiveBrokerAdapter();
  if (!adapter.isAuthenticated()) {
    throw new Error(`${adapter.label} is not authenticated. Connect and authenticate the broker before placing real orders.`);
  }
  return adapter.placeOrder(req);
}
