import type { Request, Response } from 'express';
import { brokerManagerService } from '../services/brokerManager.service';
import { ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';
import { AngelOneApiError } from '../brokers/angelOne/angelOneHttp';
import { sendSuccess, sendError } from '../utils/apiResponse';

/**
 * Simple, brokerId-less mock API surface — always resolves to Angel One via
 * BrokerManagerService (the same registry/service the multi-broker
 * :brokerId routes in broker.controller.ts use), so there is exactly one
 * place that owns real session state. Each handler maps a thrown
 * AngelOneApiError to its real statusCode (401 for an expired/missing
 * session, SmartAPI's own upstream status otherwise) instead of the shared
 * error middleware's blanket 500.
 */
function getDefaultBroker() {
  return brokerManagerService.getBroker(ANGEL_ONE_BROKER_ID);
}

function handleError(res: Response, err: unknown): void {
  if (err instanceof AngelOneApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected Angel One error.';
  sendError(res, message, 500);
}

export const brokerMockController = {
  async login(req: Request, res: Response): Promise<void> {
    const { clientCode, pin, totp } = (req.body ?? {}) as Record<string, unknown>;
    if (!clientCode || !pin || !totp) {
      sendError(res, 'clientCode, pin, and totp are all required.', 400);
      return;
    }
    try {
      const session = await getDefaultBroker().login({
        clientCode: String(clientCode),
        pin: String(pin),
        totp: String(totp),
      });
      sendSuccess(res, session, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      const result = await getDefaultBroker().logout();
      sendSuccess(res, result, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getProfile(_req: Request, res: Response): Promise<void> {
    try {
      const profile = await getDefaultBroker().getProfile();
      sendSuccess(res, profile, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getFunds(_req: Request, res: Response): Promise<void> {
    try {
      const funds = await getDefaultBroker().getFunds();
      sendSuccess(res, funds, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getPositions(_req: Request, res: Response): Promise<void> {
    try {
      const positions = await getDefaultBroker().getPositions();
      sendSuccess(res, positions, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getHoldings(_req: Request, res: Response): Promise<void> {
    try {
      const holdings = await getDefaultBroker().getHoldings();
      sendSuccess(res, holdings, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getOrderBook(_req: Request, res: Response): Promise<void> {
    try {
      const orders = await getDefaultBroker().getOrderBook();
      sendSuccess(res, orders, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getTradeBook(_req: Request, res: Response): Promise<void> {
    try {
      const trades = await getDefaultBroker().getTradeBook();
      sendSuccess(res, trades, 200);
    } catch (err) {
      handleError(res, err);
    }
  },
};
