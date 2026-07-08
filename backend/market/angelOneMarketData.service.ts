import axios from 'axios';
import { angelOneService } from '../brokers/angelOne/angelOne.service';
import { ANGEL_ONE_API_BASE_URL, ANGEL_ONE_ENDPOINTS } from '../brokers/angelOne/angelOne.constants';
import { authHeaders, getClientNetworkHeaders, requestWithRetry, unwrapAngelOneEnvelope } from '../brokers/angelOne/angelOneHttp';
import type { NiftyGreeks } from './nifty.types';

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
export class AngelOneMarketDataService {
  async getQuotes(nfoTokens: string[]): Promise<Map<string, NiftyRestSnapshot>> {
    const result = new Map<string, NiftyRestSnapshot>();
    if (nfoTokens.length === 0) return result;

    const token = await angelOneService.getValidAccessToken();
    const http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
    const networkHeaders = await getClientNetworkHeaders();

    const body = await requestWithRetry<{ fetched?: RawQuoteEntry[]; unfetched?: RawUnfetchedEntry[] }>(http, {
      url: ANGEL_ONE_ENDPOINTS.MARKET_DATA,
      method: 'POST',
      headers: { ...authHeaders(token), ...networkHeaders },
      data: { mode: 'FULL', exchangeTokens: { NFO: nfoTokens } },
    });
    // TEMP DIAGNOSTIC — the exact envelope Angel One sent back, before
    // unwrapAngelOneEnvelope touches it at all.
    // eslint-disable-next-line no-console
    console.log('[Diag] getQuotes RAW envelope (pre-unwrap)', JSON.stringify(body));
    const data = unwrapAngelOneEnvelope(body);

    // TEMP DIAGNOSTIC — the code only ever read `fetched`; if Angel One
    // rejects a token it goes into `unfetched` instead, silently producing
    // ltp: 0 downstream with zero indication why.
    // eslint-disable-next-line no-console
    console.log('[Diag] getQuotes raw response', {
      requestedTokens: nfoTokens,
      fetchedCount: data.fetched?.length ?? 0,
      fetched: data.fetched,
      unfetched: data.unfetched,
    });

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
    const token = await angelOneService.getValidAccessToken();
    const http = axios.create({ baseURL: ANGEL_ONE_API_BASE_URL, timeout: 15000 });
    const networkHeaders = await getClientNetworkHeaders();

    const body = await requestWithRetry<{ fetched?: RawQuoteEntry[]; unfetched?: RawUnfetchedEntry[] }>(http, {
      url: ANGEL_ONE_ENDPOINTS.MARKET_DATA,
      method: 'POST',
      headers: { ...authHeaders(token), ...networkHeaders },
      data: { mode: 'LTP', exchangeTokens: { NSE: [nseIndexToken] } },
    });
    // TEMP DIAGNOSTIC — the exact envelope Angel One sent back, before unwrap.
    // eslint-disable-next-line no-console
    console.log('[Diag] getIndexQuote RAW envelope (pre-unwrap)', JSON.stringify(body));
    const data = unwrapAngelOneEnvelope(body);
    // TEMP DIAGNOSTIC
    // eslint-disable-next-line no-console
    console.log('[Diag] getIndexQuote raw response', {
      requestedToken: nseIndexToken, fetched: data.fetched, unfetched: data.unfetched,
    });
    return data.fetched?.[0]?.ltp ?? 0;
  }

  /**
   * Requirement 6 explicitly says Greeks only "if available from the data
   * source" — this call can genuinely return nothing usable for some
   * expiries, so callers must treat every field as optional and degrade
   * gracefully rather than assume Greeks are always present.
   */
  async getGreeks(expiryRaw: string): Promise<Map<string, NiftyGreeks>> {
    const result = new Map<string, NiftyGreeks>();
    try {
      const token = await angelOneService.getValidAccessToken();
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
