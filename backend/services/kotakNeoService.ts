import axios, { type AxiosInstance } from 'axios';
import { kotakNeoConfig, isKotakNeoConfigured } from '../config/env';
import {
  KOTAK_NEO_ENDPOINTS,
  KOTAK_NEO_SESSION_TTL_SECONDS,
  KOTAK_NEO_DEFAULT_FIN_KEY,
} from './kotakNeo.constants';
import { KotakNeoApiError, extractKotakError, requestWithRetry } from './kotakNeoHttp';
import type {
  KotakNeoLoginRequest,
  KotakNeoViewTokenResponse,
  KotakNeoTradeTokenResponse,
  KotakNeoSession,
  KotakNeoSessionSummary,
  KotakNeoStatusResult,
  KotakNeoProfile,
} from './kotakNeo.types';

export { KotakNeoApiError } from './kotakNeoHttp';

const REQUIRED_LOGIN_FIELDS: (keyof KotakNeoLoginRequest)[] = [
  'consumerKey', 'consumerSecret', 'mobileNumber', 'ucc', 'totp', 'mpin',
];

/** Masks all but the last 2 digits so mobile numbers never appear in full in logs. */
function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length <= 2) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 2) + digits.slice(-2);
}

function toSummary(session: KotakNeoSession): KotakNeoSessionSummary {
  return {
    clientId: session.clientId,
    userName: session.userName,
    loginTime: session.loginTime,
    sessionExpiresAt: session.sessionExpiresAt,
    sessionStatus: 'ACTIVE',
  };
}

/**
 * Real Kotak Neo (Kotak Securities Trade API) integration over plain REST
 * (axios) — no unofficial third-party SDK. Endpoint paths, header names,
 * and request/response field names below are verified directly from the
 * official Kotak-Neo/Kotak-neo-api-v2 SDK source (see kotakNeo.constants.ts
 * for exact file references), not guessed.
 *
 * The session — including the trade token, sid, and server id — lives only
 * in-memory on this instance for the lifetime of the server process: never
 * written to disk, never logged, and never included in any response body
 * this service returns. The TOTP, MPIN, and consumer secret used to obtain
 * that session are local variables for the duration of login() only; they
 * are never assigned to any stored field.
 *
 * One instance per app user — see kotakNeoSessionRegistry.ts. This class
 * used to be exported as a single shared singleton (`currentSession` for the
 * entire process), which meant any authenticated user's trading calls
 * silently ran against whichever Kotak Neo account most recently logged in.
 * Construct via getOrCreateKotakNeoSession(userId), never `new
 * KotakNeoService()` directly outside the registry.
 *
 * getActiveSession() is how KotakNeoTradingService integrates the session
 * automatically — every trading call reads it fresh, so a user is never
 * asked to log in again while it's still valid, and gets a real 401 the
 * moment it isn't.
 */
export class KotakNeoService {
  private readonly http: AxiosInstance;
  private currentSession: KotakNeoSession | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: kotakNeoConfig.baseUrl || undefined,
      timeout: 15000,
    });
  }

  /**
   * OAuth2 client_credentials exchange (consumerKey:consumerSecret, Basic
   * auth) -> access_token. Kotak's trading calls themselves don't use this
   * token for authentication (they use the Authorization/Sid/Auth headers
   * set up by the view/trade token steps below); this token is only used
   * as the Bearer credential on logout, matching the official SDK's own
   * LogoutAPI implementation.
   */
  private async sessionInit(consumerKey: string, consumerSecret: string): Promise<string | null> {
    const basicToken = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    try {
      const data = await requestWithRetry<{ access_token?: string }>(this.http, {
        url: KOTAK_NEO_ENDPOINTS.SESSION_INIT,
        method: 'POST',
        headers: { Authorization: `Basic ${basicToken}`, 'Content-Type': 'application/json' },
        data: { grant_type: 'client_credentials' },
      });
      return data.access_token ?? null;
    } catch (err) {
      // Non-fatal — logout degrades to "clear local session" if this ever
      // fails, exactly like the official SDK's own logout() does when no
      // bearer_token is present.
      // eslint-disable-next-line no-console
      console.warn('[KotakNeo] session_init (oauth2) failed — continuing without a Bearer token', {
        message: extractKotakError(err).message,
      });
      return null;
    }
  }

  async login(credentials: KotakNeoLoginRequest): Promise<KotakNeoSessionSummary> {
    const missing = REQUIRED_LOGIN_FIELDS.filter((key) => !credentials[key]?.toString().trim());
    if (missing.length > 0) {
      throw new KotakNeoApiError(`Missing required field(s): ${missing.join(', ')}.`, 400);
    }
    if (!isKotakNeoConfigured()) {
      throw new KotakNeoApiError(
        'Kotak Neo API is not configured on the server. Set KOTAK_CONSUMER_KEY, KOTAK_CONSUMER_SECRET, and KOTAK_BASE_URL.',
        500,
      );
    }

    // eslint-disable-next-line no-console
    console.log('[KotakNeo] login attempt', { mobileNumber: maskMobile(credentials.mobileNumber), ucc: credentials.ucc });

    try {
      // Step 1: view token (mobileNumber + ucc + totp).
      const viewTokenData = await requestWithRetry<{ data?: KotakNeoViewTokenResponse }>(this.http, {
        url: KOTAK_NEO_ENDPOINTS.VIEW_TOKEN,
        method: 'POST',
        headers: {
          Authorization: kotakNeoConfig.consumerKey,
          'neo-fin-key': KOTAK_NEO_DEFAULT_FIN_KEY,
          'Content-Type': 'application/json',
        },
        data: {
          mobileNumber: credentials.mobileNumber,
          ucc: credentials.ucc,
          totp: credentials.totp,
        },
      });
      const viewToken = viewTokenData.data?.token;
      const sid = viewTokenData.data?.sid;
      if (!viewToken || !sid) {
        throw new KotakNeoApiError('Kotak Neo did not return a view token/sid for this login attempt.', 502);
      }

      // Step 2: trade token (mpin), authenticated with the view token from step 1.
      const tradeTokenData = await requestWithRetry<{ data?: KotakNeoTradeTokenResponse }>(this.http, {
        url: KOTAK_NEO_ENDPOINTS.TRADE_TOKEN,
        method: 'POST',
        headers: {
          Authorization: kotakNeoConfig.consumerKey,
          sid,
          Auth: viewToken,
          'neo-fin-key': KOTAK_NEO_DEFAULT_FIN_KEY,
          'Content-Type': 'application/json',
        },
        data: { mpin: credentials.mpin },
      });
      const trade = tradeTokenData.data;
      if (!trade?.token || !trade.sid || !trade.hsServerId || !trade.baseUrl) {
        throw new KotakNeoApiError('Kotak Neo did not return a complete trade session for this login attempt.', 502);
      }

      // Step 3 (best-effort): OAuth2 bearer token, needed only for logout.
      const bearerToken = await this.sessionInit(credentials.consumerKey, credentials.consumerSecret);

      const now = Date.now();
      const session: KotakNeoSession = {
        clientId: trade.ucc || credentials.ucc,
        userName: trade.greetingName || '',
        tradeToken: trade.token,
        sid: trade.sid,
        serverId: trade.hsServerId,
        dataCenter: trade.dataCenter,
        tradeBaseUrl: trade.baseUrl,
        bearerToken,
        loginTime: new Date(now).toISOString(),
        sessionExpiresAt: new Date(now + KOTAK_NEO_SESSION_TTL_SECONDS * 1000).toISOString(),
      };

      this.currentSession = session;
      // eslint-disable-next-line no-console
      console.log('[KotakNeo] login succeeded', { clientId: session.clientId });
      return toSummary(session);
    } catch (err) {
      const apiErr = err instanceof KotakNeoApiError ? err : extractKotakError(err);
      // eslint-disable-next-line no-console
      console.error('[KotakNeo] login failed', { message: apiErr.message, statusCode: apiErr.statusCode });
      throw apiErr;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    const session = this.currentSession;
    if (session) {
      try {
        await requestWithRetry(this.http, {
          url: KOTAK_NEO_ENDPOINTS.LOGOUT,
          method: 'POST',
          baseURL: session.tradeBaseUrl,
          headers: {
            ...(session.bearerToken ? { Authorization: `Bearer ${session.bearerToken}` } : {}),
            Sid: session.sid,
            Auth: session.tradeToken,
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      } catch (err) {
        // Best-effort — the local session is cleared regardless of whether
        // Kotak's own logout call succeeds, so the user is never stuck
        // "connected" here if their upstream session already lapsed.
        // eslint-disable-next-line no-console
        console.warn('[KotakNeo] logout call failed (clearing local session anyway)', {
          message: extractKotakError(err).message,
        });
      }
    }
    this.currentSession = null;
    return { success: true };
  }

  /** Clears the session if its TTL has passed and reports whether it did. Automatic expiry detection, shared by validateSession() and getActiveSession(). */
  private pruneIfExpired(): boolean {
    if (!this.currentSession) return false;
    const isExpired = Date.now() >= Date.parse(this.currentSession.sessionExpiresAt);
    if (isExpired) {
      // eslint-disable-next-line no-console
      console.log('[KotakNeo] session expired — clearing', { clientId: this.currentSession.clientId });
      this.currentSession = null;
    }
    return isExpired;
  }

  async validateSession(): Promise<KotakNeoStatusResult> {
    this.pruneIfExpired();
    if (!this.currentSession) return { connected: false };
    return { connected: true, ...toSummary(this.currentSession) };
  }

  /**
   * The session KotakNeoTradingService (and any other future caller) reads
   * automatically before every trading call — never re-prompts for login
   * while it's valid, and returns null the instant it isn't so the caller
   * can surface a real 401 instead of guessing.
   */
  getActiveSession(): KotakNeoSession | null {
    this.pruneIfExpired();
    return this.currentSession;
  }

  /**
   * Kotak Neo's official API has no session-refresh endpoint — sessions are
   * only ever established via a fresh login() (view token -> trade token).
   * This always throws 401 so callers know to re-authenticate rather than
   * silently pretending a refresh happened.
   */
  async refreshSession(): Promise<never> {
    throw new KotakNeoApiError(
      'Kotak Neo does not support session refresh — call login() again to re-authenticate.',
      401,
    );
  }

  /** No dedicated profile endpoint exists — these fields are already bundled into the trade-token response from login(). */
  async getProfile(): Promise<KotakNeoProfile> {
    const session = this.getActiveSession();
    if (!session) {
      throw new KotakNeoApiError('Not connected to Kotak Neo.', 401);
    }
    return {
      clientId: session.clientId,
      userName: session.userName,
      mobileNumber: '',
    };
  }
}
