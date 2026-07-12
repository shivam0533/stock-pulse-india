import type { Request, Response } from 'express';
import { brokerManagerService } from '../services/brokerManager.service';
import { ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';
import type { AngelOneService } from '../brokers/angelOne/angelOne.service';
import { AngelOneApiError } from '../brokers/angelOne/angelOneHttp';
import { maskKey, angelOneStaticIp, appPublicUrl } from '../config/env';
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
    const { clientCode, pin, totp, apiKey } = (req.body ?? {}) as Record<string, unknown>;
    if (!clientCode || !pin || !totp || !apiKey) {
      sendError(res, 'clientCode, pin, totp, and apiKey are all required.', 400);
      return;
    }
    try {
      const broker = getDefaultBroker(req) as AngelOneService;
      const session = await broker.login({
        clientCode: String(clientCode),
        pin: String(pin),
        totp: String(totp),
        apiKey: String(apiKey),
      });
      // Multi-user session isolation diagnostic — masked API key (now this
      // user's OWN key, not a shared one — Angel One's 2026 entitlement
      // rules tie trading access to whichever account created the key) +
      // userId + a non-reversible session fingerprint, so a support
      // investigation can confirm from logs alone that two different users
      // never share a session, without ever logging a real credential.
      // eslint-disable-next-line no-console
      console.log('[AngelOne][diag] login', {
        userId: req.userId,
        apiKeyUsed: maskKey(String(apiKey)),
        sessionId: broker.getDiagnosticId(),
      });
      sendSuccess(res, session, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  /**
   * Public (any authenticated app user) setup info for the per-user SmartAPI
   * app every Angel One connection now needs — see AngelOneLoginRequest.apiKey.
   * `staticIp` is empty until Static Outbound IPs is actually enabled on
   * Railway and ANGEL_ONE_STATIC_IP is set; the frontend banner stays
   * hidden in that case rather than showing an incomplete/misleading setup.
   */
  async getAngelOneSetupInfo(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      staticIp: angelOneStaticIp || null,
      redirectUrl: appPublicUrl,
    });
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
