import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import type { CompletedOptionTrade } from '@/types';

/**
 * Best-effort persistence — called the instant a trade closes
 * (optionTrade.store.ts) so it survives independently of this browser's own
 * local storage and becomes visible to the Admin Panel (Trades/Analytics).
 * Never awaited by the caller for anything user-facing: a failure here must
 * never block or roll back a trade that has already genuinely closed.
 */
export const tradesService = {
  async recordTrade(trade: CompletedOptionTrade, isPaper: boolean): Promise<void> {
    await apiClient.post(ENDPOINTS.trades.record, {
      id: trade.id,
      strike: trade.strike,
      side: trade.side,
      expiry: trade.expiry,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      orderType: trade.orderType,
      productType: trade.productType,
      lotSize: trade.lotSize,
      lots: trade.lots,
      quantity: trade.quantity,
      investment: trade.investment,
      pnlAmount: trade.pnlAmount,
      pnlPercent: trade.pnlPercent,
      exitReason: trade.exitReason,
      exitKind: trade.exitKind,
      strategyName: trade.strategyName,
      isPaper,
      entryTime: trade.entryTime,
      exitTime: trade.exitTime,
      stopLoss: trade.stopLoss,
      target: trade.target,
    });
  },
};
