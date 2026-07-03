export type AnalyticsPeriod = '1M' | '3M' | '6M' | '1Y' | 'All';

export interface PerfSummary {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;          // 0–100 %
  roi: number;              // total return %
  grossProfit: number;      // sum of winning P&L
  grossLoss: number;        // sum of losing P&L (absolute)
  netProfit: number;        // grossProfit - grossLoss
  maxDrawdown: number;      // % (negative)
  sharpeRatio: number;
  avgWin: number;           // avg profit per winning trade
  avgLoss: number;          // avg loss per losing trade
  profitFactor: number;     // grossProfit / grossLoss
  expectancy: number;       // expected value per trade ₹
  initialCapital: number;
  finalCapital: number;
}

export interface AnalyticsEquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;         // % drawdown from peak (negative)
  peak: number;             // running peak equity
}

export interface MonthlyPoint {
  month: string;            // "Jul 2025"
  timestamp: number;
  profit: number;
  trades: number;
  winRate: number;
}

export interface DailyPoint {
  label: string;            // "01 Jul"
  timestamp: number;
  profit: number;
  cumulative: number;       // running total
}

export type TradeBucket = 'Large Win' | 'Small Win' | 'Micro Win' | 'Breakeven' | 'Small Loss' | 'Large Loss';

export interface TradeDistItem {
  bucket: TradeBucket;
  count: number;
  pct: number;
  color: string;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  summary: PerfSummary;
  equityCurve: AnalyticsEquityPoint[];
  monthlyProfit: MonthlyPoint[];
  dailyProfit: DailyPoint[];
  tradeDistribution: TradeDistItem[];
}
