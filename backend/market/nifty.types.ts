/** Domain types for the real NIFTY Option Chain market-data pipeline. */

export type OptionSide = 'CE' | 'PE';

/** One row from the Angel One instrument master, filtered to NIFTY index options only. */
export interface NiftyInstrument {
  token: string;
  symbol: string;
  /** DDMMMYYYY, e.g. "07JUL2026" — the instrument master's own expiry format. */
  expiry: string;
  /** Real strike price in ₹ (already divided by 100 from the raw file). */
  strike: number;
  side: OptionSide;
  lotSize: number;
  tickSize: number;
  /** Exchange-mandated max quantity per order for this contract (Angel One instrument master's own freeze_qty) — orders above this are rejected by NSE, not just by Angel One. */
  freezeQty: number;
}

/** One resolved NIFTY expiry available to trade, derived from the instrument master (never hardcoded). */
export interface NiftyExpiryInfo {
  /** DDMMMYYYY, matching NiftyInstrument.expiry — the join key back to the instrument master. */
  raw: string;
  /** Epoch ms, midnight IST of the expiry date. */
  date: number;
  label: string; // "03 Jul 2026" — same display format the existing UI already uses
  dte: number;
  type: 'weekly' | 'monthly';
  lotSize: number;
}

/** A live tick as decoded from Angel One's binary SnapQuote WebSocket frame (field names verified from the official SDK's binary-parser layout). */
export interface NiftyLiveTick {
  token: string;
  ltp: number;
  volume: number;
  openInterest: number;
  openInterestChange: number;
  bestBid: number;
  bestAsk: number;
  updatedAt: number;
}

export interface NiftyGreeks {
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}
