import type { OptionOrderType, OptionProductType } from '@services/broker/broker.types';

export type OptionSide = 'CE' | 'PE';
export type { OptionOrderType, OptionProductType };
export type OptionTradeStatus = 'OPEN' | 'SL_HIT' | 'TARGET_HIT' | 'MANUAL_EXIT' | 'AUTO_SQUARE_OFF';
export type OptionExitKind = 'STOP_LOSS' | 'TARGET' | 'MANUAL' | 'AUTO_SQUARE_OFF';
/** Human-readable exit reason, e.g. "Stop Loss Hit (-3%)" — percent reflects the configured Option Chain Risk Settings at trade-open time. */
export type OptionExitReason = string;

export interface ActiveOptionTrade {
  id: string;
  strike: number;
  side: OptionSide;
  expiry: string;
  /** Angel One instrument-master expiry key (e.g. "07JUL2026") — present only when this trade was opened against live data; lets the live P&L monitor fetch this exact contract's real LTP. */
  expiryRaw?: string;
  entryPrice: number;
  currentLTP: number;
  stopLoss: number;
  target: number;
  /** Max-loss % used to compute stopLoss for this trade (captured from Option Chain Risk Settings at open time). */
  lossPercent: number;
  /** Max-profit % used to compute target for this trade. */
  profitPercent: number;
  /** Whether SL/Target auto-close is enabled for this trade ("Apply Automatically" at open time). */
  autoExitEnabled: boolean;
  /** Order type used to enter this trade — MARKET for every Auto Trading entry; user-selectable for manual entries. */
  orderType: OptionOrderType;
  /** INTRADAY (default) auto-squares-off at 3:20 PM IST; CARRYFORWARD is held overnight and is exempt from that square-off. */
  productType: OptionProductType;
  /** Trigger price used for SL/SL-M entries, if any. */
  triggerPrice?: number;
  /** Contract lot size at trade-open time (from lotSize.config.ts). */
  lotSize: number;
  /** Number of lots bought. */
  lots: number;
  /** lotSize × lots. */
  quantity: number;
  /** entryPrice × quantity. */
  investment: number;
  /** investment × lossPercent/100 — the ₹ amount at stake. */
  maxLossAmount: number;
  /** investment × profitPercent/100 — the ₹ upside target. */
  maxProfitAmount: number;
  status: OptionTradeStatus;
  entryTime: number;
  exitTime: number | null;
  /** Set only when exitTrade() was called with 'AI_REVERSAL' — distinguishes an AI-triggered early exit from a plain user-initiated Manual Exit. Absent for every other exit path. */
  exitTrigger?: 'AI_REVERSAL';
}

export interface CompletedOptionTrade {
  id: string;
  strike: number;
  side: OptionSide;
  expiry: string;
  entryPrice: number;
  exitPrice: number;
  orderType: OptionOrderType;
  productType: OptionProductType;
  lotSize: number;
  lots: number;
  quantity: number;
  investment: number;
  /** Gross P&L in ₹, scaled by quantity: (exitPrice - entryPrice) × quantity. */
  pnlAmount: number;
  pnlPercent: number;  // signed %, quantity-independent
  exitReason: OptionExitReason;
  exitKind: OptionExitKind;
  entryTime: number;
  exitTime: number;
  /** Stop Loss price configured for this trade at open time. */
  stopLoss: number;
  /** Target price configured for this trade at open time. */
  target: number;
  /** Always "Manual (Option Chain)" — every Option Chain trade is a manual BUY, there is no algo/strategy selection in this module. */
  strategyName: string;
  /** Set only when exitTrade() was called with 'AI_REVERSAL'. See ActiveOptionTrade.exitTrigger. */
  exitTrigger?: 'AI_REVERSAL';
}
