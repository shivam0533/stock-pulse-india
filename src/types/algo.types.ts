export type BotStatus = 'running' | 'stopped' | 'paused' | 'risk_paused' | 'error';
export type RiskStatus = 'safe' | 'warning' | 'limit_reached';
export type LogLevel = 'INFO' | 'EXEC' | 'WARN' | 'ERROR' | 'SYS';
export type ApiHealth = 'connected' | 'degraded' | 'disconnected';
export type OrderSideAlgo = 'BUY' | 'SELL';
export type AlgoOrderStatus = 'PENDING' | 'PARTIAL' | 'OPEN';

export interface StrategyParam {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
}

export interface Strategy {
  id: string;
  name: string;
  shortName: string;
  description: string;
  timeframe: string;
  params: StrategyParam[];
  indicators: string[];
  riskPerTrade: number;   // %
  maxPositions: number;
}

export interface BotTrade {
  id: string;
  symbol: string;
  name: string;
  side: OrderSideAlgo;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  stopLoss: number;
  target: number;
  enteredAt: number;
  strategySignal: string;
}

export interface AlgoOrder {
  id: string;
  symbol: string;
  side: OrderSideAlgo;
  orderType: 'LIMIT' | 'MARKET' | 'SL';
  status: AlgoOrderStatus;
  quantity: number;
  filledQty: number;
  price: number;
  placedAt: number;
  reason: string;
}

export interface ApiConnection {
  id: string;
  name: string;
  description: string;
  status: ApiHealth;
  latencyMs: number;
  lastCheck: number;
  endpoint: string;
}

export interface RiskMetric {
  label: string;
  current: number;
  max: number;
  unit: string;
  status: 'safe' | 'warning' | 'critical';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  symbol?: string;
  orderId?: string;
}

export interface BotStats {
  uptimeSeconds: number;
  todayPnL: number;
  todayTrades: number;
  winTrades: number;
  lossTrades: number;
  totalVolume: number;
  avgSlippage: number;
  openPositions: number;
  maxPositions: number;
}

// ── Daily Risk Management ────────────────────────────────────────────────────

export interface DailyRiskSettings {
  maxTradesPerDay: number;   // Default: 10
  maxDailyLosses: number;    // Default: 4
  riskPerTrade: number;      // Default: 1.5 %
  autoStop: boolean;         // Default: true
}

export interface DailyRiskState {
  date: string;              // YYYY-MM-DD of current trading session
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  dailyPnL: number;
  tradingEnabled: boolean;
  riskStatus: RiskStatus;
  limitReachedAt: number | null;
  resetAt: number | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  pnl: number;
  closedAt: number;
  outcome: 'win' | 'loss';
}
