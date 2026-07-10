import { brokerApiClient, toBrokerApiError } from '@api/brokerApiClient';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import type { BrokerAdapter, BrokerOrderRequest, BrokerOrderResult, BrokerExitRequest } from './broker.types';

interface NiftyOrderResponse {
  orderId: string;
  exchangeOrderId?: string;
  uniqueOrderId: string;
  status: string;
  tradingSymbol: string;
}

/**
 * Real Angel One SmartAPI adapter for NIFTY options — calls the backend's
 * real NIFTY order endpoint (POST /api/nifty/orders/place), which resolves
 * the correct symbolToken automatically from the live instrument master
 * (backend/market/instrumentMaster.service.ts) before placing the order via
 * the real AngelOneService. No mock data, no placeholder symbolToken —
 * a real network call is made whenever this adapter is active, and the
 * backend rejects the request with a real, real error if `expiryRaw` is
 * missing (i.e. the chain being viewed isn't live Angel One data).
 *
 * `filledPrice` is the quoted premium at click time, not a post-fill
 * reconciled average price — SmartAPI's placeOrder response only confirms
 * acceptance (orderid), not a fill price; a true average fill price would
 * require polling the order book afterward.
 */
export const angelOneBrokerAdapter: BrokerAdapter = {
  id: 'ANGEL_ONE',
  label: 'Angel One SmartAPI',

  isAuthenticated: () => {
    const connection = useBrokerConnectionStore.getState().connections.ANGEL_ONE;
    return !!connection && connection.sessionExpiresAt > Date.now();
  },

  placeOrder: async (req: BrokerOrderRequest): Promise<BrokerOrderResult> => {
    if (!angelOneBrokerAdapter.isAuthenticated()) {
      throw new Error('Angel One is not connected. Complete broker authentication before placing live orders.');
    }
    if (!req.expiryRaw) {
      throw new Error('Cannot place a real Angel One order — this option chain is not live data (no resolvable expiry).');
    }

    try {
      const { data } = await brokerApiClient.post<{ success: true; data: NiftyOrderResponse }>(
        '/nifty/orders/place',
        {
          strike: req.strike,
          side: req.side,
          expiryRaw: req.expiryRaw,
          quantity: req.quantity,
          orderType: req.orderType,
          productType: req.productType,
          price: req.price,
          triggerPrice: req.triggerPrice,
        },
      );
      return {
        filledPrice: req.price,
        brokerOrderId: data.data.orderId,
      };
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },

  /**
   * Real SELL order to close an existing long position (SL/Target/trailing-
   * stop/manual-exit/auto-square-off) — backend/controllers/
   * niftyOptionChain.controller.ts's exitOrder caps the quantity at whatever
   * Angel One actually reports as held, so this can never place a naked
   * short even if called with a stale/wrong quantity.
   */
  exitOrder: async (req: BrokerExitRequest): Promise<BrokerOrderResult> => {
    if (!angelOneBrokerAdapter.isAuthenticated()) {
      throw new Error('Angel One is not connected. Complete broker authentication before exiting a live position.');
    }
    if (!req.expiryRaw) {
      throw new Error('Cannot place a real Angel One exit order — this trade has no resolvable expiry.');
    }

    try {
      const { data } = await brokerApiClient.post<{ success: true; data: NiftyOrderResponse & { quantity: number } }>(
        '/nifty/orders/exit',
        {
          strike: req.strike,
          side: req.side,
          expiryRaw: req.expiryRaw,
          quantity: req.quantity,
          productType: req.productType,
        },
      );
      return {
        filledPrice: 0, // SmartAPI's placeOrder response only confirms acceptance, not a fill price — the caller falls back to the live LTP that triggered this exit.
        brokerOrderId: data.data.orderId,
      };
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },
};
