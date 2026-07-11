import type { Request, Response } from 'express';
import { brokerManagerService } from '../services/brokerManager.service';
import { ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';
import { AngelOneApiError } from '../brokers/angelOne/angelOneHttp';
import { sendSuccess, sendError } from '../utils/apiResponse';

/**
 * Simple, brokerId-less API surface — this is the route the frontend's
 * real Angel One login modal actually calls (POST /api/broker/login,
 * matched before the parameterized /api/broker/:brokerId/* routes). Always
 * resolves to Angel One via BrokerManagerService, scoped to the requesting
 * app user (req.userId, set by requireAuth on brokerMock.routes.ts) — never
 * a shared/global session, so one user's login can never be visible to
 * another. Each handler maps a thrown AngelOneApiError to its real
 * statusCode (401 for an expired/missing session, SmartAPI's own upstream
 * status otherwise) instead of the shared error middleware's blanket 500.
 */
function getDefaultBroker(req: Request) {
  return brokerManagerService.getBroker(ANGEL_ONE_BROKER_ID, req.userId!);
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
      const session = await getDefaultBroker(req).login({
        clientCode: String(clientCode),
        pin: String(pin),
        totp: String(totp),
      });
      sendSuccess(res, session, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await getDefaultBroker(req).logout();
      sendSuccess(res, result, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await getDefaultBroker(req).getProfile();
      sendSuccess(res, profile, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getFunds(req: Request, res: Response): Promise<void> {
    try {
      const funds = await getDefaultBroker(req).getFunds();
      sendSuccess(res, funds, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions = await getDefaultBroker(req).getPositions();
      sendSuccess(res, positions, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getHoldings(req: Request, res: Response): Promise<void> {
    try {
      const holdings = await getDefaultBroker(req).getHoldings();
      sendSuccess(res, holdings, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getOrderBook(req: Request, res: Response): Promise<void> {
    try {
      const orders = await getDefaultBroker(req).getOrderBook();
      sendSuccess(res, orders, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getTradeBook(req: Request, res: Response): Promise<void> {
    try {
      const trades = await getDefaultBroker(req).getTradeBook();
      sendSuccess(res, trades, 200);
    } catch (err) {
      handleError(res, err);
    }
  },
};
