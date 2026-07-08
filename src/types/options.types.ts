export type OptionExpiry = {
  label: string;     // "03 Jul 2026"
  date: number;      // timestamp
  dte: number;       // days to expiry
  type: 'weekly' | 'monthly';
  /** Angel One instrument-master expiry key (e.g. "07JUL2026") — present only when the chain is live data; used to resolve the correct symbolToken automatically when placing a real order. */
  raw?: string;
};

export interface OptionGreeks {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionStrike {
  strike: number;
  // Call side
  callLTP: number;
  callOI: number;       // in lots
  callChgOI: number;    // change in OI (signed)
  callVolume: number;
  callIV: number;       // implied volatility %
  /** Best bid/ask — only populated for live (Angel One) data. */
  callBid?: number;
  callAsk?: number;
  callGreeks?: OptionGreeks;
  // Put side
  putLTP: number;
  putOI: number;
  putChgOI: number;
  putVolume: number;
  putIV: number;
  putBid?: number;
  putAsk?: number;
  putGreeks?: OptionGreeks;
}

export interface OptionChainData {
  expiry: OptionExpiry;
  spotPrice: number;
  atmStrike: number;
  strikes: OptionStrike[];
  pcr: number;        // put/call OI ratio
  maxPain: number;    // strike with max OI
  totalCallOI: number;
  totalPutOI: number;
  updatedAt: number;
}

export type OptionSortKey =
  | 'strike'
  | 'callOI'
  | 'putOI'
  | 'callVolume'
  | 'putVolume'
  | 'callLTP'
  | 'putLTP';

export type StrikesAround = 10 | 20 | 30 | 'all';

export interface OptionChainFilter {
  expiryIndex: number;
  strikesAround: StrikesAround;
  sortKey: OptionSortKey;
  sortDir: 'asc' | 'desc';
  search: string;
}
