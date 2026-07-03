export type TradeStatus   = 'WIN' | 'LOSS' | 'OPEN' | 'BREAKEVEN';
export type TradeSide     = 'LONG' | 'SHORT';

export interface TradeRecord {
  id: string;
  entryDate: number;
  exitDate: number | null;
  symbol: string;
  name: string;
  sector: string;
  strategy: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  profit: number;         // positive when WIN
  loss: number;           // positive when LOSS (absolute value)
  netPnL: number;         // signed: positive = profit, negative = loss
  charges: number;        // brokerage + taxes
  holdingDays: number;
  status: TradeStatus;
  notes?: string;
}

export type TradeSortKey =
  | 'entryDate'
  | 'symbol'
  | 'strategy'
  | 'entryPrice'
  | 'exitPrice'
  | 'netPnL'
  | 'status';

export interface TradeFilter {
  search: string;
  status:   TradeStatus | 'ALL';
  strategy: string;       // strategy name or 'ALL'
  period:   '7D' | '30D' | '90D' | 'ALL';
}
