import type { Request, Response } from 'express';
import { brokerManagerService, type SupportedBrokerId } from '../services/brokerManager.service';
import type { AngelOneService } from '../brokers/angelOne/angelOne.service';
import { ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';
import { angelOneConfig, maskKey } from '../config/env';
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
      const broker = resolveBroker(req);
      // Same multi-user session isolation diagnostic as the login handler
      // (brokerMock.controller.ts) — logged before the call so the session
      // fingerprint is captured even if getFunds() itself then throws.
      if (req.params.brokerId?.toUpperCase() === ANGEL_ONE_BROKER_ID) {
        // eslint-disable-next-line no-console
        console.log('[AngelOne][diag] getFunds', {
          userId: req.userId,
          apiKeyUsed: maskKey(angelOneConfig.apiKey),
          sessionId: (broker as AngelOneService).getDiagnosticId(),
        });
      }
      const funds = await broker.getFunds();
      if (req.params.brokerId?.toUpperCase() === ANGEL_ONE_BROKER_ID) {
        // eslint-disable-next-line no-console
        console.log('[AngelOne][diag] getFunds SUCCEEDED', { userId: req.userId, sessionId: (broker as AngelOneService).getDiagnosticId() });
      }
      sendSuccess(res, funds);
    } catch (err) {
      if (req.params.brokerId?.toUpperCase() === ANGEL_ONE_BROKER_ID) {
        // eslint-disable-next-line no-console
        console.error('[AngelOne][diag] getFunds FAILED', {
          userId: req.userId,
          message: err instanceof Error ? err.message : String(err),
          statusCode: hasStatusCode(err) ? err.statusCode : undefined,
        });
      }
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

  /**
   * Temporary diagnostic (RBAC/entitlement investigation) — runs every
   * secure Angel One call against the CALLER's own already-connected
   * session and reports each one's real status/message, so a single
   * request can show whether a rejection is isolated to getRMS or affects
   * every trading endpoint. placeOrder is probed with a symbolToken that
   * cannot correspond to a real tradable instrument, specifically so it
   * cannot execute a real trade regardless of auth outcome — it can only
   * ever fail (either on entitlement, or on Angel One's own "invalid
   * token" validation), never fill.
   */
  async entitlementCheck(req: Request, res: Response): Promise<void> {
    const broker = resolveBroker(req) as AngelOneService;
    const results: Record<string, { ok: boolean; statusCode?: number; message?: string }> = {};

    const probe = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        results[name] = { ok: true };
      } catch (err) {
        results[name] = {
          ok: false,
          statusCode: hasStatusCode(err) ? err.statusCode : undefined,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    };

    await probe('getProfile', () => broker.getProfile());
    await probe('getRMS', () => broker.getFunds());
    await probe('getPositions', () => broker.getPositions());
    await probe('getHoldings', () => broker.getHoldings());
    await probe('getOrderBook', () => broker.getOrderBook());
    await probe('placeOrder (safe probe — invalid token, cannot fill)', () => broker.placeOrder({
      tradingSymbol: 'DIAGNOSTIC-PROBE-INVALID',
      symbolToken: '999999999',
      exchange: 'NFO',
      transactionType: 'BUY',
      orderType: 'MARKET',
      productType: 'INTRADAY',
      variety: 'NORMAL',
      quantity: 1,
    }));

    // eslint-disable-next-line no-console
    console.log('[AngelOne][diag] entitlementCheck', { userId: req.userId, sessionId: broker.getDiagnosticId(), results });
    sendSuccess(res, results);
  },
};
