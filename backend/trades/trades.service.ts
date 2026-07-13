import { pool } from '../db/pool';
import { TradeApiError } from './trades.errors';
import type { RecordTradeInput } from './trades.types';

class TradesService {
  /**
   * Called by the frontend the instant a trade closes (SL/Target/Manual/
   * Auto-Square-Off, paper or live) — this is the one write path that makes
   * a trade visible to the Admin Panel (Trades/Analytics) and to this same
   * user from a different device/browser, neither of which the purely
   * client-side Zustand-persisted history (optionTrade.store.ts) can do.
   * `ON CONFLICT DO NOTHING` on the trade's own id makes this safe to call
   * more than once for the same trade (e.g. a retried request).
   */
  async recordTrade(userId: string, input: RecordTradeInput): Promise<void> {
    if (!input.id || !Number.isFinite(input.entryPrice) || !Number.isFinite(input.exitPrice)) {
      throw new TradeApiError('Malformed trade payload.', 400);
    }
    await pool.query(
      `INSERT INTO trades (
        id, user_id, broker_order_id, strike, side, expiry, entry_price, exit_price,
        order_type, product_type, lot_size, lots, quantity, investment,
        pnl_amount, pnl_percent, exit_reason, exit_kind, strategy_name, is_paper,
        entry_time, exit_time, stop_loss, target
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, to_timestamp($21 / 1000.0), to_timestamp($22 / 1000.0), $23, $24
      )
      ON CONFLICT (id) DO NOTHING`,
      [
        input.id, userId, input.brokerOrderId ?? null, input.strike, input.side, input.expiry,
        input.entryPrice, input.exitPrice, input.orderType, input.productType, input.lotSize,
        input.lots, input.quantity, input.investment, input.pnlAmount, input.pnlPercent,
        input.exitReason ?? null, input.exitKind, input.strategyName ?? null, input.isPaper,
        input.entryTime, input.exitTime, input.stopLoss ?? null, input.target ?? null,
      ],
    );
  }
}

export const tradesService = new TradesService();
