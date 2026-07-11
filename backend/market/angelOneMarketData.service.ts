import axios from 'axios';
import { getAnyLiveAngelOneSession } from '../brokers/angelOne/angelOneSessionRegistry';
import { ANGEL_ONE_API_BASE_URL, ANGEL_ONE_ENDPOINTS } from '../brokers/angelOne/angelOne.constants';
import { AngelOneApiError, authHeaders, getClientNetworkHeaders, requestWithRetry, unwrapAngelOneEnvelope } from '../brokers/angelOne/angelOneHttp';
import type { NiftyGreeks } from './nifty.types';

/**
 * This is the shared REST fallback/Greeks source — like the WebSocket, it
 * needs *a* valid Angel One session to authenticate with, not a specific
 * user's (option-chain market data is identical regardless of whose
 * account asks for it).
 */
function requireAnyLiveSession() {
  const session = getAnyLiveAngelOneSession();
  if (!session) {
    throw new AngelOneApiError('Not connected to Angel One. Please log in again.', 401);
  }
  return session;
}

interface RawQuoteEntry {
  symbolToken: string;
  ltp: number;
  tradeVolume: number;
  opnInterest: number;
  depth?: { buy?: Array<{ price: number }>; sell?: Array<{ price: number }> };
}

interface RawUnfetchedEntry {
  symbolToken?: string;
  message?: string;
  errorCode?: string;
}

export interface NiftyRestSnapshot {
  ltp: number;
  volume: number;
  openInterest: number;
  bestBid: number;
  bestAsk: number;
}

/**
 * REST market-data fallback/initial-snapshot source — used only for (a) the
 * very first paint before the WebSocket has delivered a tick for a given
 * token, and (b) Greeks, which have no WebSocket field. Endpoint paths,
 * request shape ({mode, exchangeTokens}), and response field names
 * (symbolToken/ltp/tradeVolume/opnInterest/depth.buy/sell[].price) verified
 * from Angel One's official SDK source + SmartAPI forum documentation
 * samples.
 */
/**
 * getGreeks() was being called unconditionally on every option-chain SSE
 * push (streamChain's onTick has no per-token filter, so any tick from any
 * subscribed contract across every connected user triggers a recompute) —
 * throttled only to STREAM_THROTTLE_MS (300ms), meaning a real external
 * Angel One HTTP call roughly every 300ms per open chain view during active
 * ticking. Greeks (IV/delta/gamma/theta/vega) don't meaningfully change
 * within a few seconds, so a short per-expiry cache removes nearly all of
 * that redundant load without any visible staleness.
 */
const GREEKS_CACHE_TTL_MS = 5000;
const greeksCache = new Map<string, { data: Map<string, NiftyGreeks>; fetchedAt: number }>();

export class AngelOneMarketDataService {
  async getQuotes(nfoTokens: string[]): Promise<Map<string, NiftyRestSnapshot>> {
    const result = new Map<string, NiftyRestSnapshot>();
    if (nfoTokens.length === 0) return result;

    const token = await requireAnyLiveSession().getValidAccessToken();
    const http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
    const networkHeaders = await getClientNetworkHeaders();

    const body = await requestWithRetry<{ fetched?: RawQuoteEntry[]; unfetched?: RawUnfetchedEntry[] }>(http, {
      url: ANGEL_ONE_ENDPOINTS.MARKET_DATA,
      method: 'POST',
      headers: { ...authHeaders(token), ...networkHeaders },
      data: { mode: 'FULL', exchangeTokens: { NFO: nfoTokens } },
    });
    const data = unwrapAngelOneEnvelope(body);

    for (const entry of data.fetched ?? []) {
      result.set(entry.symbolToken, {
        ltp: entry.ltp ?? 0,
        volume: entry.tradeVolume ?? 0,
        openInterest: entry.opnInterest ?? 0,
        bestBid: entry.depth?.buy?.[0]?.price ?? 0,
        bestAsk: entry.depth?.sell?.[0]?.price ?? 0,
      });
    }
    return result;
  }

  async getIndexQuote(nseIndexToken: string): Promise<number> {
    const token = await requireAnyLiveSession().getValidAccessToken();
    const http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
    const networkHeaders = await getClientNetworkHeaders();

    const body = await requestWithRetry<{ fetched?: RawQuoteEntry[]; unfetched?: RawUnfetchedEntry[] }>(http, {
      url: ANGEL_ONE_ENDPOINTS.MARKET_DATA,
      method: 'POST',
      headers: { ...authHeaders(token), ...networkHeaders },
      data: { mode: 'LTP', exchangeTokens: { NSE: [nseIndexToken] } },
    });
    const data = unwrapAngelOneEnvelope(body);
    return data.fetched?.[0]?.ltp ?? 0;
  }

  /**
   * Requirement 6 explicitly says Greeks only "if available from the data
   * source" — this call can genuinely return nothing usable for some
   * expiries, so callers must treat every field as optional and degrade
   * gracefully rather than assume Greeks are always present.
   */
  async getGreeks(expiryRaw: string): Promise<Map<string, NiftyGreeks>> {
    const cached = greeksCache.get(expiryRaw);
    if (cached && Date.now() - cached.fetchedAt < GREEKS_CACHE_TTL_MS) {
      return cached.data;
    }

    const result = new Map<string, NiftyGreeks>();
    try {
      const token = await requireAnyLiveSession().getValidAccessToken();
      const http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
      const networkHeaders = await getClientNetworkHeaders();

      const body = await requestWithRetry<{
        fetched?: Array<{ symbolToken: string; impliedVolatility?: number; delta?: number; gamma?: number; theta?: number; vega?: number }>;
      }>(http, {
        url: ANGEL_ONE_ENDPOINTS.OPTION_GREEK,
        method: 'POST',
        headers: { ...authHeaders(token), ...networkHeaders },
        data: { name: 'NIFTY', expirydate: expiryRaw },
      });
      const data = unwrapAngelOneEnvelope(body);
      for (const entry of data.fetched ?? []) {
        result.set(entry.symbolToken, {
          iv: entry.impliedVolatility,
          delta: entry.delta,
          gamma: entry.gamma,
          theta: entry.theta,
          vega: entry.vega,
        });
      }
      // Cache only on success — a failed/empty fetch isn't cached, so the
      // very next call retries fresh instead of pinning "no Greeks" for the
      // full TTL if Angel One was just briefly unavailable.
      greeksCache.set(expiryRaw, { data: result, fetchedAt: Date.now() });
    } catch (err) {
      // Greeks are explicitly optional (requirement 6: "if available") — a
      // failure here should never break the rest of the option chain.
      // eslint-disable-next-line no-console
      console.warn('[AngelOneMarketData] optionGreek unavailable', { message: (err as Error).message });
    }
    return result;
  }
}

export const angelOneMarketDataService = new AngelOneMarketDataService();
