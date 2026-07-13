/** Mirrors the frontend's CompletedOptionTrade (src/types/optionTrade.types.ts) — the trading engine sends this shape as-is when a trade closes. */
export interface RecordTradeInput {
  id: string;
  strike: number;
  side: 'CE' | 'PE';
  expiry: string;
  entryPrice: number;
  exitPrice: number;
  orderType: string;
  productType: string;
  lotSize: number;
  lots: number;
  quantity: number;
  investment: number;
  pnlAmount: number;
  pnlPercent: number;
  exitReason?: string;
  exitKind: string;
  strategyName?: string;
  isPaper: boolean;
  entryTime: number;
  exitTime: number;
  stopLoss?: number;
  target?: number;
  brokerOrderId?: string;
}
