import { instrumentMasterService } from './instrumentMaster.service';
import { angelOneWebSocketService } from './angelOneWebSocket.service';
import { angelOneMarketDataService } from './angelOneMarketData.service';
import { NIFTY_STRIKE_STEP } from './nifty.constants';
import type { NiftyExpiryInfo, NiftyInstrument, NiftyGreeks } from './nifty.types';

/** How wide a strike band (each side of ATM) to keep resolved/streamed — generous enough to cover the existing UI's "±15 strikes" and "All" filter options without subscribing to Angel One's full, often-illiquid far-OTM strike range. */
const MAX_STRIKES_AROUND_ATM = 40;

export interface NiftyChainStrikeRow {
  strike: number;
  call: { token: string; ltp: number; oi: number; oiChange: number; volume: number; bid: number; ask: number; iv?: number; greeks?: NiftyGreeks };
  put: { token: string; ltp: number; oi: number; oiChange: number; volume: number; bid: number; ask: number; iv?: number; greeks?: NiftyGreeks };
}

export interface NiftyChainSnapshot {
  expiry: NiftyExpiryInfo;
  spotPrice: number;
  atmStrike: number;
  rows: NiftyChainStrikeRow[];
  pcr: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  updatedAt: number;
}

function nearestStrike(spot: number): number {
  return Math.round(spot / NIFTY_STRIKE_STEP) * NIFTY_STRIKE_STEP;
}

/** Same max-pain algorithm the app has always used (sum of ITM value each strike would cost option writers), just computed from real OI now instead of synthetic. */
function computeMaxPain(rows: { strike: number; callOI: number; putOI: number }[]): number {
  let best = rows[0]?.strike ?? 0;
  let bestPain = Infinity;
  for (const candidate of rows) {
    let pain = 0;
    for (const row of rows) {
      pain += row.callOI * Math.max(0, candidate.strike - row.strike);
      pain += row.putOI * Math.max(0, row.strike - candidate.strike);
    }
    if (pain < bestPain) {
      bestPain = pain;
      best = candidate.strike;
    }
  }
  return best;
}

/**
 * Assembles the real, live NIFTY option chain (requirement 2/6) — every
 * number here is either a live WebSocket tick (angelOneWebSocketService),
 * a REST snapshot fallback for a token the WS hasn't ticked yet
 * (angelOneMarketDataService), or a real instrument-master fact (strike/
 * lot size/token). Nothing here is synthetic, mock, or hardcoded.
 */
export class NiftyOptionChainService {
  // Logged at most once per process lifetime — getChain() can be called
  // many times a second (SSE stream), and this fallback only matters while
  // the WebSocket hasn't delivered an index tick yet (e.g. right after a
  // restart), so it would otherwise spam identical warnings.
  private spotQuoteFallbackLogged = false;

  async getExpiries(): Promise<NiftyExpiryInfo[]> {
    await instrumentMasterService.ensureLoaded();
    return instrumentMasterService.getExpiries();
  }

  async getChain(expiryIndex: number): Promise<NiftyChainSnapshot> {
    await instrumentMasterService.ensureLoaded();
    const expiries = instrumentMasterService.getExpiries();
    const expiry = expiries[expiryIndex];
    if (!expiry) {
      throw new Error(`No NIFTY expiry available at index ${expiryIndex}.`);
    }

    const indexToken = instrumentMasterService.getNiftyIndexToken();
    const spotFromTick = angelOneWebSocketService.getTick(indexToken)?.ltp;
    let spotPrice = spotFromTick && spotFromTick > 0 ? spotFromTick : 0;

    // The REST spot-quote fallback is only ever needed once, right after a
    // restart, before the WebSocket has delivered its first index tick.
    // A failure here (e.g. Angel One rejecting this specific REST endpoint)
    // must never block the WebSocket subscription below — that subscription
    // is exactly what makes the REST fallback unnecessary going forward.
    if (!spotPrice) {
      try {
        spotPrice = await angelOneMarketDataService.getIndexQuote(indexToken);
      } catch (err) {
        if (!this.spotQuoteFallbackLogged) {
          this.spotQuoteFallbackLogged = true;
          // eslint-disable-next-line no-console
          console.warn(
            '[NiftyOptionChain] REST spot-quote fallback failed — continuing without it. ' +
            'WebSocket subscription below is unaffected; spotPrice will self-correct once the index tick arrives.',
            { message: (err as Error).message },
          );
        }
        spotPrice = 0;
      }
    }

    const atmStrike = nearestStrike(spotPrice);
    const minStrike = atmStrike - MAX_STRIKES_AROUND_ATM * NIFTY_STRIKE_STEP;
    const maxStrike = atmStrike + MAX_STRIKES_AROUND_ATM * NIFTY_STRIKE_STEP;

    const contracts = instrumentMasterService
      .getContractsForExpiry(expiry.raw)
      .filter((c) => c.strike >= minStrike && c.strike <= maxStrike);

    const byStrike = new Map<number, { call?: NiftyInstrument; put?: NiftyInstrument }>();
    for (const c of contracts) {
      const entry = byStrike.get(c.strike) ?? {};
      if (c.side === 'CE') entry.call = c; else entry.put = c;
      byStrike.set(c.strike, entry);
    }

    const allTokens = contracts.map((c) => c.token);
    angelOneWebSocketService.ensureSubscribed(allTokens, [indexToken]);

    // REST fallback only for tokens the WebSocket hasn't delivered a tick for yet (e.g. right after (re)subscribing).
    const tokensNeedingFallback = allTokens.filter((t) => !angelOneWebSocketService.getTick(t));
    const restSnapshots = tokensNeedingFallback.length > 0
      ? await angelOneMarketDataService.getQuotes(tokensNeedingFallback).catch(() => new Map())
      : new Map();

    const greeksByToken = await angelOneMarketDataService.getGreeks(expiry.raw).catch(() => new Map<string, NiftyGreeks>());

    const readLive = (token: string) => {
      const tick = angelOneWebSocketService.getTick(token);
      if (tick) return { ltp: tick.ltp, oi: tick.openInterest, oiChange: tick.openInterestChange, volume: tick.volume, bid: tick.bestBid, ask: tick.bestAsk };
      const rest = restSnapshots.get(token);
      return { ltp: rest?.ltp ?? 0, oi: rest?.openInterest ?? 0, oiChange: 0, volume: rest?.volume ?? 0, bid: rest?.bestBid ?? 0, ask: rest?.bestAsk ?? 0 };
    };

    const rows: NiftyChainStrikeRow[] = [...byStrike.entries()]
      .sort(([a], [b]) => a - b)
      .filter(([, { call, put }]) => call && put)
      .map(([strike, { call, put }]) => {
        const callLive = readLive(call!.token);
        const putLive = readLive(put!.token);
        return {
          strike,
          call: { token: call!.token, ...callLive, iv: greeksByToken.get(call!.token)?.iv, greeks: greeksByToken.get(call!.token) },
          put: { token: put!.token, ...putLive, iv: greeksByToken.get(put!.token)?.iv, greeks: greeksByToken.get(put!.token) },
        };
      });

    const totalCallOI = rows.reduce((sum, r) => sum + r.call.oi, 0);
    const totalPutOI = rows.reduce((sum, r) => sum + r.put.oi, 0);
    const pcr = totalCallOI > 0 ? +(totalPutOI / totalCallOI).toFixed(2) : 0;
    const maxPain = computeMaxPain(rows.map((r) => ({ strike: r.strike, callOI: r.call.oi, putOI: r.put.oi })));

    return { expiry, spotPrice, atmStrike, rows, pcr, maxPain, totalCallOI, totalPutOI, updatedAt: Date.now() };
  }

  /** Requirement 4/7 — automatic symbolToken resolution for order placement. */
  async resolveContract(expiryRaw: string, strike: number, side: 'CE' | 'PE'): Promise<NiftyInstrument> {
    await instrumentMasterService.ensureLoaded();
    const contract = instrumentMasterService.resolve(expiryRaw, strike, side);
    if (!contract) {
      throw new Error(`Could not resolve a NIFTY ${side} contract for strike ${strike}, expiry ${expiryRaw}.`);
    }
    return contract;
  }

  /** Requirement 8 — real live LTP for one specific open position, used to drive Live P&L instead of a synthetic price walk. */
  async getLiveQuote(expiryRaw: string, strike: number, side: 'CE' | 'PE'): Promise<{ ltp: number }> {
    const contract = await this.resolveContract(expiryRaw, strike, side);
    const tick = angelOneWebSocketService.getTick(contract.token);
    if (tick && tick.ltp > 0) {
      // eslint-disable-next-line no-console
      console.log('[Diag] getLiveQuote — served from WS cache', { token: contract.token, cachedLtp: tick.ltp });
      return { ltp: tick.ltp };
    }

    angelOneWebSocketService.ensureSubscribed([contract.token]);
    const rest = await angelOneMarketDataService.getQuotes([contract.token]);
    const restLtp = rest.get(contract.token)?.ltp ?? 0;
    // eslint-disable-next-line no-console
    console.log('[Diag] getLiveQuote — served from REST fallback', {
      token: contract.token, wsTickPresent: !!tick, restMapHasEntry: rest.has(contract.token), restLtp,
    });
    return { ltp: restLtp };
  }
}

export const niftyOptionChainService = new NiftyOptionChainService();
