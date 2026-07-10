/**
 * Lot size for Paper Trading only. NSE-notified lot sizes are NOT static
 * (they change between contract cycles), so a real/live order must never
 * use a constant here — it always sources its lot size live from the Angel
 * One instrument master via OptionExpiry.lotSize (see
 * backend/market/instrumentMaster.service.ts -> /api/nifty/expiries ->
 * options.service.ts's toOptionExpiry() -> OptionExpiry.lotSize). Paper
 * Trading has no real broker instrument to query, so it keeps its own
 * simulated value here.
 */
export type IndexSymbol = 'NIFTY';

export const PAPER_TRADING_LOT_SIZES: Record<IndexSymbol, number> = {
  NIFTY: 65,
};

export function getPaperLotSize(index: IndexSymbol = 'NIFTY'): number {
  return PAPER_TRADING_LOT_SIZES[index];
}
