import axios, { type AxiosInstance } from 'axios';
import type { IAngelOneService } from './angelOne.interface';
import { ANGEL_ONE_BROKER_ID, ANGEL_ONE_SESSION_TTL_SECONDS, ANGEL_ONE_API_BASE_URL, ANGEL_ONE_ENDPOINTS } from './angelOne.constants';
import { isAngelOneConfigured } from '../../config/env';
import {
  AngelOneApiError,
  toAngelOneApiError,
  unwrapAngelOneEnvelope,
  requestWithRetry,
  getClientNetworkHeaders,
  authHeaders,
} from './angelOneHttp';
import type {
  AngelOneLoginRequest,
  AngelOneSession,
  AngelOneProfile,
  AngelOneFunds,
  AngelOnePosition,
  AngelOneHolding,
  PlaceOrderRequest,
  OrderResult,
  ModifyOrderRequest,
  OrderBookEntry,
  TradeBookEntry,
  MarketFeedSubscription,
  MarketFeedConnection,
} from './angelOne.types';

interface AngelOneRawSession {
  clientCode: string;
  name: string;
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  loginTime: number; // epoch ms
  expiresAt: number; // epoch ms
}

/**
 * Real Angel One SmartAPI integration over plain REST (axios) — no
 * unofficial SDK. Endpoint paths, header names (X-PrivateKey, X-UserType,
 * X-SourceID, X-ClientLocalIP, X-ClientPublicIP, X-MACAddress), and the
 * {status, message, errorcode, data} response envelope are verified
 * directly from Angel One's own official JavaScript SDK source
 * (github.com/angel-one/smartapi-javascript).
 *
 * The session — jwtToken/refreshToken/feedToken — lives in-memory in this
 * singleton for the lifetime of the server process: it's the backend's
 * source of truth for every authenticated call. The login()/refreshSession()
 * responses still hand these tokens back to the caller (unchanged existing
 * contract the frontend already persists into useBrokerConnectionStore) so
 * nothing about the existing UI/session-restore flow needs to change.
 * Password/TOTP are local variables for the duration of login() only.
 */
export class AngelOneService implements IAngelOneService {
  private readonly http: AxiosInstance;
  private session: AngelOneRawSession | null = null;

  constructor() {
    this.http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
  }

  /** Automatic session-refresh + 401 detection: called before every authenticated method below. */
  private async requireAccessToken(): Promise<string> {
    if (!this.session) {
      throw new AngelOneApiError('Not connected to Angel One. Please log in again.', 401);
    }
    if (Date.now() >= this.session.expiresAt) {
      // eslint-disable-next-line no-console
      console.log('[AngelOne] access token expired — refreshing automatically', { clientCode: this.session.clientCode });
      await this.refreshSession();
    }
    return this.session!.jwtToken;
  }

  /** Same automatic-refresh guarantee as every other method here, exposed for market-data/REST callers outside this class. */
  async getValidAccessToken(): Promise<string> {
    return this.requireAccessToken();
  }

  /**
   * Read-only credentials the live market-data WebSocket needs to connect
   * (x-client-code / Authorization / x-feed-token — verified from the
   * official SDK's WebSocketV2). Returns null when not connected so callers
   * can hold off starting/subscribing until a real session exists. Never
   * exposed over HTTP — only consumed in-process by angelOneWebSocket.service.ts.
   */
  getMarketFeedCredentials(): { clientCode: string; jwtToken: string; feedToken: string } | null {
    if (!this.session) return null;
    return {
      clientCode: this.session.clientCode,
      jwtToken: this.session.jwtToken,
      feedToken: this.session.feedToken,
    };
  }

  async login(credentials: AngelOneLoginRequest): Promise<AngelOneSession> {
    if (!credentials.clientCode?.trim() || !credentials.pin?.trim() || !credentials.totp?.trim()) {
      throw new AngelOneApiError('Client Code, PIN, and TOTP are all required.', 400);
    }
    if (!isAngelOneConfigured()) {
      throw new AngelOneApiError('Angel One API is not configured on the server. Set ANGEL_ONE_API_KEY.', 500);
    }

    // eslint-disable-next-line no-console
    console.log('[AngelOne] login attempt', { clientCode: credentials.clientCode });

    try {
      const networkHeaders = await getClientNetworkHeaders();
      const loginBody = await requestWithRetry<{ jwtToken: string; refreshToken: string; feedToken: string }>(
        this.http,
        {
          url: ANGEL_ONE_ENDPOINTS.LOGIN,
          method: 'POST',
          headers: { ...authHeaders(), ...networkHeaders },
          // SmartAPI's own field is literally "password" — Angel One accounts
          // commonly use a numeric login PIN in that field, hence this app's
          // AngelOneLoginRequest calling it `pin`.
          data: { clientcode: credentials.clientCode, password: credentials.pin, totp: credentials.totp },
        },
      );
      const tokens = unwrapAngelOneEnvelope(loginBody);
      if (!tokens.jwtToken) {
        throw new AngelOneApiError('Angel One did not return a session token for this login attempt.', 502);
      }

      const now = Date.now();
      this.session = {
        clientCode: credentials.clientCode,
        name: '',
        jwtToken: tokens.jwtToken,
        refreshToken: tokens.refreshToken,
        feedToken: tokens.feedToken,
        loginTime: now,
        expiresAt: now + ANGEL_ONE_SESSION_TTL_SECONDS * 1000,
      };

      // Enrich with the account name via the real profile call — best-effort,
      // login itself has already succeeded even if this fails.
      try {
        const profile = await this.getProfile();
        this.session.name = profile.name;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[AngelOne] getProfile after login failed (session still valid)', {
          message: toAngelOneApiError(err).message,
        });
      }

      // eslint-disable-next-line no-console
      console.log('[AngelOne] login succeeded', { clientCode: this.session.clientCode });

      return {
        jwtToken: this.session.jwtToken,
        refreshToken: this.session.refreshToken,
        feedToken: this.session.feedToken,
        clientCode: this.session.clientCode,
        name: this.session.name || this.session.clientCode,
        broker: ANGEL_ONE_BROKER_ID,
        loginTime: new Date(this.session.loginTime).toISOString(),
        expiresIn: ANGEL_ONE_SESSION_TTL_SECONDS,
      };
    } catch (err) {
      const apiErr = toAngelOneApiError(err);
      // eslint-disable-next-line no-console
      console.error('[AngelOne] login failed', { message: apiErr.message, statusCode: apiErr.statusCode });
      throw apiErr;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    const session = this.session;
    if (session) {
      try {
        const networkHeaders = await getClientNetworkHeaders();
        await requestWithRetry(this.http, {
          url: ANGEL_ONE_ENDPOINTS.LOGOUT,
          method: 'POST',
          headers: { ...authHeaders(session.jwtToken), ...networkHeaders },
          data: { clientcode: session.clientCode },
        });
      } catch (err) {
        // Best-effort — the local session is cleared regardless of whether
        // Angel One's own logout call succeeds.
        // eslint-disable-next-line no-console
        console.warn('[AngelOne] logout call failed (clearing local session anyway)', {
          message: toAngelOneApiError(err).message,
        });
      }
    }
    this.session = null;
    return { success: true };
  }

  /** Automatic session refresh (requirement: refresh expired sessions transparently) — real generateTokens call using the stored refreshToken. */
  async refreshSession(): Promise<AngelOneSession> {
    if (!this.session) {
      throw new AngelOneApiError('No active Angel One session to refresh.', 401);
    }
    try {
      const networkHeaders = await getClientNetworkHeaders();
      const body = await requestWithRetry<{ jwtToken: string; refreshToken: string }>(this.http, {
        url: ANGEL_ONE_ENDPOINTS.REFRESH_SESSION,
        method: 'POST',
        headers: { ...authHeaders(this.session.jwtToken), ...networkHeaders },
        data: { refreshToken: this.session.refreshToken },
      });
      const tokens = unwrapAngelOneEnvelope(body);
      if (!tokens.jwtToken) {
        throw new AngelOneApiError('Angel One did not return a refreshed session token.', 502);
      }

      const now = Date.now();
      this.session = {
        ...this.session,
        jwtToken: tokens.jwtToken,
        refreshToken: tokens.refreshToken || this.session.refreshToken,
        expiresAt: now + ANGEL_ONE_SESSION_TTL_SECONDS * 1000,
      };

      // eslint-disable-next-line no-console
      console.log('[AngelOne] session refreshed', { clientCode: this.session.clientCode });

      return {
        jwtToken: this.session.jwtToken,
        refreshToken: this.session.refreshToken,
        feedToken: this.session.feedToken,
        clientCode: this.session.clientCode,
        name: this.session.name || this.session.clientCode,
        broker: ANGEL_ONE_BROKER_ID,
        loginTime: new Date(this.session.loginTime).toISOString(),
        expiresIn: ANGEL_ONE_SESSION_TTL_SECONDS,
      };
    } catch (err) {
      // The refresh token itself is invalid/expired (SmartAPI sessions fully
      // lapse at 12 midnight IST) — the only real recovery is a fresh login.
      this.session = null;
      const apiErr = toAngelOneApiError(err);
      // eslint-disable-next-line no-console
      console.error('[AngelOne] session refresh failed — re-login required', { message: apiErr.message });
      throw new AngelOneApiError(apiErr.message, 401);
    }
  }

  async getProfile(): Promise<AngelOneProfile> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<{
      clientcode: string; name: string; email: string; mobileno: string; exchanges: string[]; products: string[];
    }>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.PROFILE,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body);
    return {
      clientCode: data.clientcode ?? this.session?.clientCode ?? '',
      name: data.name ?? '',
      email: data.email ?? '',
      mobile: data.mobileno ?? '',
      exchanges: data.exchanges ?? [],
      products: data.products ?? [],
      broker: ANGEL_ONE_BROKER_ID,
    };
  }

  async getFunds(): Promise<AngelOneFunds> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<{
      net: string; availablecash: string; availablelimitmargin: string; utiliseddebits: string; collateral: string; m2mrealized: string; m2munrealized: string;
    }>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.FUNDS,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body);
    const availableCash = Number(data.availablecash ?? 0);
    const m2mRealized = Number(data.m2mrealized ?? 0);
    const m2mUnrealized = Number(data.m2munrealized ?? 0);
    return {
      availableCash,
      availableMargin: Number(data.availablelimitmargin ?? 0),
      utilisedMargin: Number(data.utiliseddebits ?? 0),
      collateral: Number(data.collateral ?? 0),
      payin: 0,
      payout: 0,
      net: Number(data.net ?? 0),
      openingBalance: +(availableCash - m2mRealized - m2mUnrealized).toFixed(2),
    };
  }

  async getPositions(): Promise<AngelOnePosition[]> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<Array<{
      tradingsymbol: string; exchange: string; producttype: string; netqty: string; avgnetprice: string; ltp: string; pnl: string; buyqty: string; sellqty: string;
    }>>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.POSITIONS,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body) ?? [];
    return (Array.isArray(data) ? data : []).map((p) => ({
      tradingSymbol: p.tradingsymbol,
      exchange: p.exchange,
      productType: p.producttype,
      quantity: Number(p.netqty ?? 0),
      averagePrice: Number(p.avgnetprice ?? 0),
      ltp: Number(p.ltp ?? 0),
      pnl: Number(p.pnl ?? 0),
      side: Number(p.buyqty ?? 0) >= Number(p.sellqty ?? 0) ? 'BUY' : 'SELL',
    }));
  }

  async getHoldings(): Promise<AngelOneHolding[]> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<Array<{
      tradingsymbol: string; exchange: string; isin: string; quantity: number; averageprice: number; ltp: number; pnl: number;
    }>>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.HOLDINGS,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body) ?? [];
    return (Array.isArray(data) ? data : []).map((h) => ({
      tradingSymbol: h.tradingsymbol,
      exchange: h.exchange,
      isin: h.isin,
      quantity: Number(h.quantity ?? 0),
      averagePrice: Number(h.averageprice ?? 0),
      ltp: Number(h.ltp ?? 0),
      pnl: Number(h.pnl ?? 0),
    }));
  }

  async placeOrder(order: PlaceOrderRequest): Promise<OrderResult> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    try {
      const body = await requestWithRetry<{ script: string; orderid: string; uniqueorderid: string }>(this.http, {
        url: ANGEL_ONE_ENDPOINTS.PLACE_ORDER,
        method: 'POST',
        headers: { ...authHeaders(token), ...networkHeaders },
        data: {
          variety: order.variety,
          tradingsymbol: order.tradingSymbol,
          symboltoken: order.symbolToken,
          transactiontype: order.transactionType,
          exchange: order.exchange,
          ordertype: order.orderType,
          producttype: order.productType,
          duration: 'DAY',
          price: order.price ?? 0,
          triggerprice: order.triggerPrice ?? 0,
          squareoff: 0,
          stoploss: 0,
          quantity: order.quantity,
        },
      });
      const data = unwrapAngelOneEnvelope(body);
      // SmartAPI's placeOrder response only confirms acceptance, not a
      // terminal fill status — that comes from polling getOrderBook().
      return { orderId: data.orderid, uniqueOrderId: data.uniqueorderid, status: 'PENDING' };
    } catch (err) {
      throw toAngelOneApiError(err);
    }
  }

  async modifyOrder(orderId: string, updates: ModifyOrderRequest): Promise<OrderResult> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    try {
      const body = await requestWithRetry<{ orderid: string; uniqueorderid: string }>(this.http, {
        url: ANGEL_ONE_ENDPOINTS.MODIFY_ORDER,
        method: 'POST',
        headers: { ...authHeaders(token), ...networkHeaders },
        data: {
          orderid: orderId,
          variety: updates.variety,
          tradingsymbol: updates.tradingSymbol,
          symboltoken: updates.symbolToken,
          exchange: updates.exchange,
          producttype: updates.productType,
          duration: updates.duration ?? 'DAY',
          ordertype: updates.orderType,
          price: updates.price,
          triggerprice: updates.triggerPrice,
          quantity: updates.quantity,
        },
      });
      const data = unwrapAngelOneEnvelope(body);
      return { orderId: data.orderid ?? orderId, uniqueOrderId: data.uniqueorderid, status: 'OPEN' };
    } catch (err) {
      throw toAngelOneApiError(err);
    }
  }

  async cancelOrder(orderId: string): Promise<OrderResult> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    try {
      const body = await requestWithRetry<{ orderid: string; uniqueorderid: string }>(this.http, {
        url: ANGEL_ONE_ENDPOINTS.CANCEL_ORDER,
        method: 'POST',
        headers: { ...authHeaders(token), ...networkHeaders },
        data: { variety: 'NORMAL', orderid: orderId },
      });
      const data = unwrapAngelOneEnvelope(body);
      return { orderId: data.orderid ?? orderId, uniqueOrderId: data.uniqueorderid, status: 'CANCELLED' };
    } catch (err) {
      throw toAngelOneApiError(err);
    }
  }

  async getOrderBook(): Promise<OrderBookEntry[]> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<Array<{
      orderid: string; exchorderid?: string; tradingsymbol: string; transactiontype: 'BUY' | 'SELL';
      quantity: string; price: string; orderstatus: string; status?: string; updatetime: string;
    }>>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.ORDER_BOOK,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body) ?? [];
    return (Array.isArray(data) ? data : []).map((o) => ({
      orderId: o.orderid,
      exchangeOrderId: o.exchorderid,
      tradingSymbol: o.tradingsymbol,
      transactionType: o.transactiontype,
      quantity: Number(o.quantity ?? 0),
      price: Number(o.price ?? 0),
      status: mapOrderStatus(o.orderstatus ?? o.status),
      orderTime: o.updatetime,
    }));
  }

  async getTradeBook(): Promise<TradeBookEntry[]> {
    const token = await this.requireAccessToken();
    const networkHeaders = await getClientNetworkHeaders();
    const body = await requestWithRetry<Array<{
      tradeid: string; orderid: string; tradingsymbol: string; transactiontype: 'BUY' | 'SELL'; fillsize: string; fillprice: string; filltime: string;
    }>>(this.http, {
      url: ANGEL_ONE_ENDPOINTS.TRADE_BOOK,
      method: 'GET',
      headers: { ...authHeaders(token), ...networkHeaders },
    });
    const data = unwrapAngelOneEnvelope(body) ?? [];
    return (Array.isArray(data) ? data : []).map((t) => ({
      tradeId: t.tradeid,
      orderId: t.orderid,
      tradingSymbol: t.tradingsymbol,
      transactionType: t.transactiontype,
      quantity: Number(t.fillsize ?? 0),
      price: Number(t.fillprice ?? 0),
      tradeTime: t.filltime,
    }));
  }

  async connectMarketFeed(_subscription: MarketFeedSubscription): Promise<MarketFeedConnection> {
    // Real-time market feed is a persistent WebSocket connection (a
    // fundamentally different transport from the REST calls above) and is
    // out of scope for this pass — no live orders/positions/holdings/order
    // book/trade book/funds depend on it.
    throw new AngelOneApiError('Angel One market feed WebSocket is not implemented yet.', 501);
  }

  async disconnectMarketFeed(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

/**
 * The one AngelOneService instance for the whole process — brokerManager.service.ts
 * uses this same singleton (not its own `new AngelOneService()`) so every
 * consumer (broker controllers AND the NIFTY market-data/WebSocket code)
 * shares one real session, never two independent ones.
 */
export const angelOneService = new AngelOneService();

function mapOrderStatus(raw: string | undefined): 'PENDING' | 'OPEN' | 'COMPLETE' | 'CANCELLED' | 'REJECTED' {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('reject')) return 'REJECTED';
  if (s.includes('cancel')) return 'CANCELLED';
  if (s.includes('complete')) return 'COMPLETE';
  if (s.includes('open') || s.includes('trigger pending')) return 'OPEN';
  return 'PENDING';
}
