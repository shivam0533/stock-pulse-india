import type { Request, Response } from 'express';
import { brokerManagerService, type SupportedBrokerId } from '../services/brokerManager.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

/**
 * HTTP glue only — every handler resolves the requested broker through
 * BrokerManagerService and delegates to its IBrokerService methods. No
 * broker-specific logic lives here (Single Responsibility); this file would
 * look identical regardless of which broker is behind the abstraction.
 *
 * handleError is intentionally broker-agnostic: it duck-types any thrown
 * error carrying a numeric `statusCode` (e.g. AngelOneApiError, a future
 * broker's own error type) instead of importing a specific broker's error
 * class here, so this file keeps working unchanged as more brokers land.
 */
function resolveBroker(req: Request) {
  const brokerId = req.params.brokerId.toUpperCase() as SupportedBrokerId;
  // req.userId is always set here — every route in broker.routes.ts is
  // behind requireAuth now, which runs before this.
  return brokerManagerService.getBroker(brokerId, req.userId!);
}

function hasStatusCode(err: unknown): err is { message: string; statusCode: number } {
  return typeof err === 'object' && err !== null && 'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number';
}

function handleError(res: Response, err: unknown): void {
  if (hasStatusCode(err)) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected broker error.';
  sendError(res, message, 500);
}

export const brokerController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const session = await resolveBroker(req).login(req.body);
      sendSuccess(res, session);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await resolveBroker(req).logout();
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async refreshSession(req: Request, res: Response): Promise<void> {
    try {
      const session = await resolveBroker(req).refreshSession();
      sendSuccess(res, session);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await resolveBroker(req).getProfile();
      sendSuccess(res, profile);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getFunds(req: Request, res: Response): Promise<void> {
    try {
      const funds = await resolveBroker(req).getFunds();
      sendSuccess(res, funds);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions = await resolveBroker(req).getPositions();
      sendSuccess(res, positions);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getHoldings(req: Request, res: Response): Promise<void> {
    try {
      const holdings = await resolveBroker(req).getHoldings();
      sendSuccess(res, holdings);
    } catch (err) {
      handleError(res, err);
    }
  },

  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const order = await resolveBroker(req).placeOrder(req.body);
      sendSuccess(res, order, 201);
    } catch (err) {
      handleError(res, err);
    }
  },

  async modifyOrder(req: Request, res: Response): Promise<void> {
    try {
      const order = await resolveBroker(req).modifyOrder(req.params.orderId, req.body);
      sendSuccess(res, order);
    } catch (err) {
      handleError(res, err);
    }
  },

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const order = await resolveBroker(req).cancelOrder(req.params.orderId);
      sendSuccess(res, order);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getOrderBook(req: Request, res: Response): Promise<void> {
    try {
      const orders = await resolveBroker(req).getOrderBook();
      sendSuccess(res, orders);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getTradeBook(req: Request, res: Response): Promise<void> {
    try {
      const trades = await resolveBroker(req).getTradeBook();
      sendSuccess(res, trades);
    } catch (err) {
      handleError(res, err);
    }
  },

  async connectMarketFeed(req: Request, res: Response): Promise<void> {
    try {
      const connection = await resolveBroker(req).connectMarketFeed(req.body);
      sendSuccess(res, connection);
    } catch (err) {
      handleError(res, err);
    }
  },

  async disconnectMarketFeed(req: Request, res: Response): Promise<void> {
    try {
      const result = await resolveBroker(req).disconnectMarketFeed();
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },
};
