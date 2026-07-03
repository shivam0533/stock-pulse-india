import type { PortfolioHolding } from './stock.types';

export interface AccountSummary {
  portfolioValue: number;
  todayPnL: number;
  todayPnLPercent: number;
  totalInvestment: number;
  availableBalance: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'SL' | 'SL-M';
export type OrderStatus = 'OPEN' | 'PENDING' | 'PARTIAL';

export interface OpenOrder {
  id: string;
  symbol: string;
  name: string;
  side: OrderSide;
  orderType: OrderType;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price: number;
  placedAt: number;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  side: OrderSide;
  quantity: number;
  price: number;
  value: number;
  pnl: number;
  executedAt: number;
}

export type SignalAction = 'BUY' | 'SELL' | 'HOLD';
export type SignalStrength = 'Strong' | 'Moderate' | 'Weak';

export interface TradingSignal {
  id: string;
  symbol: string;
  name: string;
  action: SignalAction;
  strength: SignalStrength;
  confidence: number;
  reason: string;
  targetPrice: number;
  generatedAt: number;
}

export interface AISignalFactor {
  label: string;
  score: number;
}

export interface AIConfidence {
  overallScore: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  marketTrend: 'Uptrend' | 'Downtrend' | 'Sideways';
  factors: AISignalFactor[];
  summary: string;
  updatedAt: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  invested: number;
}

export interface GrowthPoint {
  timestamp: number;
  value: number;
}

export interface DailyPnLPoint {
  label: string;
  timestamp: number;
  pnl: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percent: number;
}

export type ActivePosition = PortfolioHolding;
