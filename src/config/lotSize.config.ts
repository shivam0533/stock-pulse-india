/**
 * NSE lot sizes, keyed by index. Single source of truth for lot-size math
 * across the Option Chain module — every component reads through
 * getLotSize(), nothing hardcodes a lot size anywhere else.
 */
export type IndexSymbol = 'NIFTY';

/**
 * Official NSE-notified lot sizes. Used automatically once a real broker
 * (Zerodha, Angel One, Upstox, Shoonya) is authenticated and executing the
 * order — real orders must match the exchange's actual contract size.
 */
export const OFFICIAL_NSE_LOT_SIZES: Record<IndexSymbol, number> = {
  NIFTY: 75,
};

/**
 * Lot size used in Paper Trading mode only. Change this value only — every
 * Option Chain calculation (Order Window, Quantity, Investment, Active
 * Trade, Trade History, Live P&L, Max Loss/Profit ₹, SL/Target) picks it up
 * automatically via getLotSize().
 */
export const PAPER_TRADING_LOT_SIZES: Record<IndexSymbol, number> = {
  NIFTY: 65,
};

export function getLotSize(index: IndexSymbol = 'NIFTY', isPaperTrading = true): number {
  return isPaperTrading ? PAPER_TRADING_LOT_SIZES[index] : OFFICIAL_NSE_LOT_SIZES[index];
}
