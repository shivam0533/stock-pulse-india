import axios, { type AxiosInstance } from 'axios';
import { kotakNeoService } from './kotakNeoService';
import { KotakNeoApiError, extractKotakError, requestWithRetry, toJDataForm } from './kotakNeoHttp';
import { KOTAK_NEO_TRADING_ENDPOINTS, KOTAK_NEO_ORDER_SOURCE } from './kotakNeoTrading.constants';
import type { KotakNeoSession } from './kotakNeo.types';
import type {
  KotakNeoPlaceOrderRequest,
  KotakNeoModifyOrderRequest,
  KotakNeoCancelOrderRequest,
  KotakNeoOrderActionResult,
  KotakNeoOrderBookEntry,
  KotakNeoTradeBookEntry,
  KotakNeoPositionEntry,
  KotakNeoHoldingEntry,
  KotakNeoLimitsRequest,
  KotakNeoFunds,
} from './kotakNeoTrading.types';

/**
 * Real Kotak Neo trading operations over plain REST (axios) — no
 * unofficial SDK. Endpoint paths, header names, and request/response field
 * names are verified directly from the official Kotak-Neo/Kotak-neo-api-v2
 * SDK source and docs (see kotakNeoTrading.constants.ts).
 *
 * Session integration (requirements 4/5): every method below calls
 * kotakNeoService.getActiveSession() itself — callers never pass a token.
 * If a session is present and not expired, the call proceeds immediately;
 * the user is never asked to log in again. If it's missing or expired,
 * this throws a real 401 (KotakNeoApiError) instead of attempting a
 * request that Kotak would reject anyway.
 */
export class KotakNeoTradingService {
  private readonly http: AxiosInstance;

  constructor() {
    // No fixed baseURL — every request below sets `baseURL: session.tradeBaseUrl`
    // per-call, since that URL is only known after login and can differ by session.
    this.http = axios.create({ timeout: 15000 });
  }

  private requireSession(): KotakNeoSession {
    const session = kotakNeoService.getActiveSession();
    if (!session) {
      throw new KotakNeoApiError('Not connected to Kotak Neo. Please log in again.', 401);
    }
    return session;
  }

  private authHeaders(session: KotakNeoSession, extra?: Record<string, string>) {
    return { Sid: session.sid, Auth: session.tradeToken, ...extra };
  }

  async placeOrder(order: KotakNeoPlaceOrderRequest): Promise<KotakNeoOrderActionResult> {
    const session = this.requireSession();
    const body = {
      am: order.amo ?? 'NO',
      dq: order.disclosedQuantity ?? '0',
      es: order.exchangeSegment,
      mp: order.marketProtection ?? '0',
      pc: order.product,
      pf: order.pf ?? 'N',
      pr: order.price,
      pt: order.orderType,
      qt: order.quantity,
      rt: order.validity,
      tp: order.triggerPrice ?? '0',
      ts: order.tradingSymbol,
      tt: order.transactionType,
      ig: order.tag,
      tk: order.scripToken,
      sot: order.squareOffType,
      slt: order.stopLossType,
      slv: order.stopLossValue,
      sov: order.squareOffValue,
      lat: order.lastTradedPrice,
      tlt: order.trailingStopLoss,
      tsv: order.trailingSlValue,
      os: KOTAK_NEO_ORDER_SOURCE,
    };

    try {
      return await requestWithRetry<KotakNeoOrderActionResult>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.PLACE_ORDER,
        method: 'POST',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        data: toJDataForm(body),
      });
    } catch (err) {
      throw this.rethrow(err, 'placeOrder');
    }
  }

  async modifyOrder(order: KotakNeoModifyOrderRequest): Promise<KotakNeoOrderActionResult> {
    const session = this.requireSession();
    const body = {
      no: order.orderId,
      tk: order.instrumentToken,
      es: order.exchangeSegment,
      pc: order.product,
      pr: order.price,
      pt: order.orderType,
      qt: order.quantity,
      vd: order.validity,
      ts: order.tradingSymbol,
      tt: order.transactionType,
      tp: order.triggerPrice ?? '0',
      dq: order.disclosedQuantity,
      mp: order.marketProtection,
      fq: order.filledQuantity ?? '0',
      am: order.amo ?? 'NO',
      dd: order.dd ?? 'NA',
      os: KOTAK_NEO_ORDER_SOURCE,
    };

    try {
      return await requestWithRetry<KotakNeoOrderActionResult>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.MODIFY_ORDER,
        method: 'POST',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        data: toJDataForm(body),
      });
    } catch (err) {
      throw this.rethrow(err, 'modifyOrder');
    }
  }

  async cancelOrder(order: KotakNeoCancelOrderRequest): Promise<KotakNeoOrderActionResult> {
    const session = this.requireSession();
    const body = { on: order.orderId, am: order.amo ?? 'NO' };

    try {
      return await requestWithRetry<KotakNeoOrderActionResult>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.CANCEL_ORDER,
        method: 'POST',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        data: toJDataForm(body),
      });
    } catch (err) {
      throw this.rethrow(err, 'cancelOrder');
    }
  }

  async getOrderBook(): Promise<KotakNeoOrderBookEntry[]> {
    const session = this.requireSession();
    try {
      const data = await requestWithRetry<{ data?: KotakNeoOrderBookEntry[] }>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.ORDER_BOOK,
        method: 'GET',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { accept: 'application/json' }),
      });
      return data.data ?? [];
    } catch (err) {
      throw this.rethrow(err, 'getOrderBook');
    }
  }

  async getTradeBook(): Promise<KotakNeoTradeBookEntry[]> {
    const session = this.requireSession();
    try {
      const data = await requestWithRetry<{ data?: KotakNeoTradeBookEntry[] }>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.TRADE_BOOK,
        method: 'GET',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { accept: 'application/json' }),
      });
      return data.data ?? [];
    } catch (err) {
      throw this.rethrow(err, 'getTradeBook');
    }
  }

  async getPositions(): Promise<KotakNeoPositionEntry[]> {
    const session = this.requireSession();
    try {
      const data = await requestWithRetry<{ data?: KotakNeoPositionEntry[] }>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.POSITIONS,
        method: 'GET',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { accept: 'application/json' }),
      });
      return data.data ?? [];
    } catch (err) {
      throw this.rethrow(err, 'getPositions');
    }
  }

  async getHoldings(): Promise<KotakNeoHoldingEntry[]> {
    const session = this.requireSession();
    try {
      const data = await requestWithRetry<{ data?: KotakNeoHoldingEntry[] }>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.HOLDINGS,
        method: 'GET',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { accept: '*/*' }),
      });
      return data.data ?? [];
    } catch (err) {
      throw this.rethrow(err, 'getHoldings');
    }
  }

  async getFunds(filters: KotakNeoLimitsRequest = {}): Promise<KotakNeoFunds> {
    const session = this.requireSession();
    const body = {
      seg: filters.segment ?? 'ALL',
      exch: filters.exchange ?? 'ALL',
      prod: filters.product ?? 'ALL',
    };

    try {
      return await requestWithRetry<KotakNeoFunds>(this.http, {
        url: KOTAK_NEO_TRADING_ENDPOINTS.LIMITS,
        method: 'POST',
        baseURL: session.tradeBaseUrl,
        params: { sId: session.serverId },
        headers: this.authHeaders(session, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        data: toJDataForm(body),
      });
    } catch (err) {
      throw this.rethrow(err, 'getFunds');
    }
  }

  /** Normalizes any failure into a KotakNeoApiError (extracting Kotak's real upstream message/status when present) and logs it — never logs the session token, sid, or any request body. */
  private rethrow(err: unknown, operation: string): KotakNeoApiError {
    const apiErr = err instanceof KotakNeoApiError ? err : extractKotakError(err);
    // eslint-disable-next-line no-console
    console.error(`[KotakNeoTrading] ${operation} failed`, { message: apiErr.message, statusCode: apiErr.statusCode });
    return apiErr;
  }
}

export const kotakNeoTradingService = new KotakNeoTradingService();
