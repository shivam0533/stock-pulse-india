export type Exchange = 'NSE' | 'BSE';

export type Sector =
  | 'Banking'
  | 'IT'
  | 'Energy'
  | 'FMCG'
  | 'Pharma'
  | 'Auto'
  | 'Metals'
  | 'Realty'
  | 'Telecom'
  | 'Infrastructure';

export interface Stock {
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: Sector;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  pe?: number;
  eps?: number;
  dividend?: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: PortfolioHolding[];
}

