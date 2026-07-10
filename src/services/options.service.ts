import { brokerApiClient, toBrokerApiError, apiOrigin } from '@api/brokerApiClient';
import type { OptionChainData, OptionExpiry, OptionStrike, OptionGreeks } from '@/types';

/**
 * Real, live NIFTY Option Chain data — calls the backend's real
 * niftyOptionChainService (backend/market/niftyOptionChain.service.ts),
 * which is itself backed by Angel One's real instrument master + WebSocket
 * + REST market data. No mock/demo/synthetic data of any kind; every call
 * here is a genuine network request, and this module replaces the previous
 * optionsMockData.ts-backed implementation entirely.
 *
 * useOptionChain.ts (the hook every Option Chain UI component consumes)
 * calls only getChain()/getExpiries() below, exactly as before — nothing
 * about the hook, OptionChainTable, OptionFiltersBar, or OptionStatsStrip
 * needed to change.
 */

interface NiftyExpiryResponse {
  raw: string;
  date: number;
  label: string;
  dte: number;
  type: 'weekly' | 'monthly';
  lotSize: number;
}

interface NiftyContractSide {
  token: string;
  ltp: number;
  oi: number;
  oiChange: number;
  volume: number;
  bid: number;
  ask: number;
  iv?: number;
  greeks?: OptionGreeks;
}

interface NiftyChainRowResponse {
  strike: number;
  call: NiftyContractSide;
  put: NiftyContractSide;
}

export interface NiftyChainResponse {
  expiry: NiftyExpiryResponse;
  spotPrice: number;
  atmStrike: number;
  rows: NiftyChainRowResponse[];
  pcr: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  updatedAt: number;
}

function toOptionExpiry(e: NiftyExpiryResponse): OptionExpiry {
  return { label: e.label, date: e.date, dte: e.dte, type: e.type, raw: e.raw, lotSize: e.lotSize };
}

function toOptionStrike(row: NiftyChainRowResponse): OptionStrike {
  return {
    strike: row.strike,
    callLTP: row.call.ltp,
    callOI: row.call.oi,
    callChgOI: row.call.oiChange,
    callVolume: row.call.volume,
    callIV: row.call.iv ?? 0,
    callBid: row.call.bid,
    callAsk: row.call.ask,
    callGreeks: row.call.greeks,
    putLTP: row.put.ltp,
    putOI: row.put.oi,
    putChgOI: row.put.oiChange,
    putVolume: row.put.volume,
    putIV: row.put.iv ?? 0,
    putBid: row.put.bid,
    putAsk: row.put.ask,
    putGreeks: row.put.greeks,
  };
}

/**
 * Shared REST/SSE mapper — the real-time stream (useOptionChain.ts) pushes
 * the exact same backend NiftyChainResponse shape this REST call returns, so
 * both paths reuse this one transform into the frontend's OptionChainData.
 */
export function mapNiftyChainResponse(chain: NiftyChainResponse): OptionChainData {
  return {
    expiry: toOptionExpiry(chain.expiry),
    spotPrice: chain.spotPrice,
    atmStrike: chain.atmStrike,
    strikes: chain.rows.map(toOptionStrike),
    pcr: chain.pcr,
    maxPain: chain.maxPain,
    totalCallOI: chain.totalCallOI,
    totalPutOI: chain.totalPutOI,
    updatedAt: chain.updatedAt,
  };
}

export interface NiftyPosition {
  tradingSymbol: string;
  exchange: string;
  productType: string;
  quantity: number;
  averagePrice: number;
  ltp: number;
  pnl: number;
  side: 'BUY' | 'SELL';
}

const POSITIONS_RECONNECT_DELAY_MS = 2000;

/**
 * Real-time NIFTY positions stream — the backend pushes a fresh snapshot
 * over Server-Sent Events the instant a subscribed position's token ticks
 * on the Angel One WebSocket (recomputing LTP/MTM live), instead of relying
 * on a manual refresh. Mirrors the exact pattern useOptionChain.ts uses for
 * /nifty/option-chain/stream, including the auto-reconnect: a native
 * EventSource does NOT retry once its readyState reaches CLOSED, which is
 * exactly what an intermediary (Railway's proxy, any CDN) does when it
 * enforces an idle/max-duration timeout on a long-lived connection — without
 * this, that silent close meant live P&L simply froze until a manual reload.
 */
export function subscribeToLivePositions(onSnapshot: (positions: NiftyPosition[]) => void): () => void {
  let source: EventSource;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const connect = () => {
    source = new EventSource(`${apiOrigin()}/api/nifty/positions/stream`);
    source.onmessage = (event) => {
      try {
        onSnapshot(JSON.parse(event.data) as NiftyPosition[]);
      } catch {
        // Malformed frame — ignore, the next tick self-corrects.
      }
    };
    source.onerror = () => {
      if (stopped || source.readyState !== EventSource.CLOSED || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!stopped) connect();
      }, POSITIONS_RECONNECT_DELAY_MS);
    };
  };
  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    source.close();
  };
}

export const optionsService = {
  /** Real, live positions from the connected Angel One account — scoped to NIFTY options only. */
  async getPositions(): Promise<NiftyPosition[]> {
    try {
      const { data } = await brokerApiClient.get<{ success: true; data: NiftyPosition[] }>('/nifty/positions');
      return data.data;
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },

  async getExpiries(): Promise<OptionExpiry[]> {
    try {
      const { data } = await brokerApiClient.get<{ success: true; data: NiftyExpiryResponse[] }>('/nifty/expiries');
      return data.data.map(toOptionExpiry);
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },

  /** Requirement 8 — real live LTP for one specific open position (drives Live P&L). */
  async getLiveQuote(strike: number, side: 'CE' | 'PE', expiryRaw: string): Promise<number> {
    try {
      const { data } = await brokerApiClient.get<{ success: true; data: { ltp: number } }>('/nifty/quote', {
        params: { strike, side, expiryRaw },
      });
      return data.data.ltp;
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },

  async getChain(expiryIndex: number): Promise<OptionChainData> {
    try {
      const { data } = await brokerApiClient.get<{ success: true; data: NiftyChainResponse }>('/nifty/option-chain', {
        params: { expiryIndex },
      });
      return mapNiftyChainResponse(data.data);
    } catch (err) {
      throw new Error(toBrokerApiError(err).message);
    }
  },
};
