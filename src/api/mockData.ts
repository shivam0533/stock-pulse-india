import type {
  Stock,
  MarketIndex,
  NewsItem,
  PricePoint,
  OpenOrder,
  Trade,
  TradingSignal,
  AIConfidence,
  EquityPoint,
  GrowthPoint,
  DailyPnLPoint,
  SectorAllocation,
} from '@/types';

// Seed-based PRNG so prices drift but stay deterministic per symbol
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashSymbol(symbol: string): number {
  return symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function generateHistory(basePrice: number, symbol: string, points = 30): PricePoint[] {
  const rand = seededRandom(hashSymbol(symbol));
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let price = basePrice * 0.85;
  return Array.from({ length: points }, (_, i) => {
    price = price * (1 + (rand() - 0.48) * 0.04);
    return {
      timestamp: now - (points - i) * day,
      price: Math.round(price * 100) / 100,
    };
  });
}

const RAW_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', price: 2843.5, change: 24.3, pct: 0.86, mcap: 192354_00_00_000, pe: 28.4 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', price: 4156.2, change: -42.1, pct: -1.0, mcap: 150421_00_00_000, pe: 31.2 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', price: 1687.8, change: 18.45, pct: 1.11, mcap: 128340_00_00_000, pe: 19.8 },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', price: 1894.6, change: 23.7, pct: 1.27, mcap: 78540_00_00_000, pe: 27.5 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', price: 1234.5, change: 11.2, pct: 0.92, mcap: 86730_00_00_000, pe: 18.4 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', price: 1543.2, change: -8.9, pct: -0.57, mcap: 91240_00_00_000, pe: 71.2 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', price: 824.3, change: 6.8, pct: 0.83, mcap: 73580_00_00_000, pe: 11.2 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', price: 2456.7, change: -14.2, pct: -0.57, mcap: 57680_00_00_000, pe: 56.4 },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', price: 463.85, change: 3.2, pct: 0.69, mcap: 58120_00_00_000, pe: 26.8 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure', price: 3672.4, change: 52.3, pct: 1.44, mcap: 50420_00_00_000, pe: 35.7 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', price: 1789.5, change: -12.4, pct: -0.69, mcap: 35690_00_00_000, pe: 18.9 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', price: 1142.3, change: 9.8, pct: 0.86, mcap: 35280_00_00_000, pe: 14.5 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', sector: 'Auto', price: 12340.6, change: 156.4, pct: 1.28, mcap: 38740_00_00_000, pe: 29.3 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Banking', price: 6823.9, change: -78.2, pct: -1.13, mcap: 42150_00_00_000, pe: 31.8 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'FMCG', price: 2845.3, change: -23.5, pct: -0.82, mcap: 27340_00_00_000, pe: 58.7 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', price: 543.2, change: 7.8, pct: 1.46, mcap: 28430_00_00_000, pe: 24.5 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', price: 1734.5, change: 21.3, pct: 1.24, mcap: 41620_00_00_000, pe: 38.4 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Auto', price: 943.8, change: -11.5, pct: -1.20, mcap: 31250_00_00_000, pe: 14.8 },
  { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'FMCG', price: 3456.2, change: 42.6, pct: 1.25, mcap: 30680_00_00_000, pe: 95.2 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', sector: 'Infrastructure', price: 1456.3, change: 28.9, pct: 2.02, mcap: 31420_00_00_000, pe: 32.7 },
] as const;

export const MOCK_STOCKS: Stock[] = RAW_STOCKS.map((s) => ({
  symbol: s.symbol,
  name: s.name,
  exchange: 'NSE',
  sector: s.sector as Stock['sector'],
  price: s.price,
  change: s.change,
  changePercent: s.pct,
  volume: Math.floor(seededRandom(hashSymbol(s.symbol))() * 5000000 + 1000000),
  marketCap: s.mcap,
  dayHigh: s.price + Math.abs(s.change) * 1.5,
  dayLow: s.price - Math.abs(s.change) * 1.5,
  open: s.price - s.change * 0.4,
  previousClose: s.price - s.change,
  yearHigh: s.price * 1.18,
  yearLow: s.price * 0.78,
  pe: s.pe,
  eps: s.price / s.pe,
  dividend: Math.round(s.price * 0.012 * 100) / 100,
}));

export const MOCK_INDICES: MarketIndex[] = [
  { symbol: 'NIFTY50', name: 'NIFTY 50', value: 24586.45, change: 124.5, changePercent: 0.51, history: generateHistory(24586, 'NIFTY50') },
  { symbol: 'SENSEX', name: 'BSE SENSEX', value: 80845.23, change: 387.2, changePercent: 0.48, history: generateHistory(80845, 'SENSEX') },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', value: 52341.85, change: -89.4, changePercent: -0.17, history: generateHistory(52341, 'BANKNIFTY') },
  { symbol: 'NIFTYIT', name: 'NIFTY IT', value: 41234.6, change: 542.3, changePercent: 1.33, history: generateHistory(41234, 'NIFTYIT') },
  { symbol: 'INDIAVIX', name: 'INDIA VIX', value: 13.42, change: -0.38, changePercent: -2.75, history: generateHistory(13.42, 'INDIAVIX') },
];

export function getStockHistory(symbol: string, points = 90): PricePoint[] {
  const stock = MOCK_STOCKS.find((s) => s.symbol === symbol);
  if (!stock) return [];
  return generateHistory(stock.price, symbol, points);
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'RBI keeps repo rate unchanged at 6.5%, maintains stance on withdrawal of accommodation',
    summary: 'The Reserve Bank of India maintained the status quo on policy rates for the eighth consecutive meeting, citing inflation concerns and growth resilience.',
    source: 'Economic Times',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 45,
    tickers: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK'],
    category: 'economy',
  },
  {
    id: 'n2',
    title: 'TCS reports strong Q1 with deal wins of $8.3 billion, margins expand 80 bps',
    summary: 'Tata Consultancy Services beat street estimates with revenue growth of 5.4% YoY in constant currency, signaling demand recovery in BFSI vertical.',
    source: 'Mint',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 60 * 2,
    tickers: ['TCS', 'INFY', 'WIPRO'],
    category: 'earnings',
  },
  {
    id: 'n3',
    title: 'Reliance Jio crosses 480 million subscribers, ARPU improves to ₹181.7',
    summary: 'Reliance Industries reported steady growth in its telecom arm with subscriber additions and tariff hike benefits flowing through.',
    source: 'Business Standard',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 60 * 4,
    tickers: ['RELIANCE', 'BHARTIARTL'],
    category: 'markets',
  },
  {
    id: 'n4',
    title: 'Bajaj Housing Finance IPO opens September 9, price band set at ₹66-70',
    summary: 'The ₹6,560 crore IPO is set to be the largest housing finance offering in Indian markets this year, with strong anchor investor interest.',
    source: 'Moneycontrol',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 60 * 6,
    tickers: ['BAJFINANCE'],
    category: 'ipo',
  },
  {
    id: 'n5',
    title: 'Indian markets close at record high, Sensex tops 80,800',
    summary: 'Benchmark indices ended the session at fresh all-time highs led by gains in banking and IT stocks. FII flows turned positive for the third straight day.',
    source: 'Reuters',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 60 * 8,
    tickers: ['NIFTY50', 'SENSEX'],
    category: 'markets',
  },
  {
    id: 'n6',
    title: 'Tata Motors PV sales decline 8% in June, EV segment grows 22%',
    summary: 'Tata Motors reported weaker passenger vehicle sales for the month, though its electric vehicle portfolio continued to gain market share.',
    source: 'CNBC TV18',
    url: '#',
    publishedAt: Date.now() - 1000 * 60 * 60 * 10,
    tickers: ['TATAMOTORS', 'MARUTI'],
    category: 'markets',
  },
];

// Simulated mock user portfolio
export const MOCK_PORTFOLIO_HOLDINGS = [
  { symbol: 'RELIANCE', quantity: 25, avgPrice: 2650.5 },
  { symbol: 'TCS', quantity: 15, avgPrice: 3850.0 },
  { symbol: 'HDFCBANK', quantity: 40, avgPrice: 1580.25 },
  { symbol: 'INFY', quantity: 30, avgPrice: 1720.8 },
  { symbol: 'ICICIBANK', quantity: 50, avgPrice: 1150.0 },
  { symbol: 'ITC', quantity: 200, avgPrice: 425.6 },
];

// Available cash balance sitting in the trading account (mock)
export const MOCK_AVAILABLE_BALANCE = 245680.5;

/** Top stocks ranked by traded volume today. */
export function getMostActiveStocks(limit = 6): Stock[] {
  return [...MOCK_STOCKS].sort((a, b) => b.volume - a.volume).slice(0, limit);
}

export const MOCK_OPEN_ORDERS: OpenOrder[] = [
  { id: 'ord1', symbol: 'WIPRO', name: 'Wipro Ltd', side: 'BUY', orderType: 'LIMIT', status: 'OPEN', quantity: 100, filledQuantity: 0, price: 538.5, placedAt: Date.now() - 1000 * 60 * 12 },
  { id: 'ord2', symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', side: 'SELL', orderType: 'SL', status: 'PENDING', quantity: 40, filledQuantity: 0, price: 930.0, placedAt: Date.now() - 1000 * 60 * 28 },
  { id: 'ord3', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', side: 'BUY', orderType: 'LIMIT', status: 'PARTIAL', quantity: 60, filledQuantity: 25, price: 1728.0, placedAt: Date.now() - 1000 * 60 * 45 },
  { id: 'ord4', symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', side: 'BUY', orderType: 'MARKET', status: 'OPEN', quantity: 20, filledQuantity: 0, price: 1456.3, placedAt: Date.now() - 1000 * 60 * 5 },
];

export const MOCK_TRADES: Trade[] = [
  { id: 'trd1', symbol: 'RELIANCE', name: 'Reliance Industries Ltd', side: 'BUY', quantity: 10, price: 2820.0, value: 28200, pnl: 235.0, executedAt: Date.now() - 1000 * 60 * 35 },
  { id: 'trd2', symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', side: 'SELL', quantity: 15, price: 1690.4, value: 25356, pnl: 1652.25, executedAt: Date.now() - 1000 * 60 * 70 },
  { id: 'trd3', symbol: 'INFY', name: 'Infosys Ltd', side: 'BUY', quantity: 20, price: 1880.1, value: 37602, pnl: -86.0, executedAt: Date.now() - 1000 * 60 * 110 },
  { id: 'trd4', symbol: 'ITC', name: 'ITC Ltd', side: 'SELL', quantity: 100, price: 461.2, value: 46120, pnl: 712.0, executedAt: Date.now() - 1000 * 60 * 150 },
  { id: 'trd5', symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', side: 'BUY', quantity: 25, price: 1228.9, value: 30722.5, pnl: 140.0, executedAt: Date.now() - 1000 * 60 * 200 },
];

export const MOCK_TRADING_SIGNALS: TradingSignal[] = [
  { id: 'sig1', symbol: 'RELIANCE', name: 'Reliance Industries Ltd', action: 'BUY', strength: 'Strong', confidence: 87, reason: 'Bullish breakout above 50-DMA with strong volume support', targetPrice: 2980, generatedAt: Date.now() - 1000 * 60 * 18 },
  { id: 'sig2', symbol: 'TCS', name: 'Tata Consultancy Services', action: 'SELL', strength: 'Moderate', confidence: 64, reason: 'Bearish divergence forming on RSI near resistance zone', targetPrice: 3980, generatedAt: Date.now() - 1000 * 60 * 42 },
  { id: 'sig3', symbol: 'INFY', name: 'Infosys Ltd', action: 'BUY', strength: 'Strong', confidence: 81, reason: 'Positive earnings momentum with sector rotation into IT', targetPrice: 1985, generatedAt: Date.now() - 1000 * 60 * 65 },
  { id: 'sig4', symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', action: 'HOLD', strength: 'Weak', confidence: 52, reason: 'Range-bound price action, awaiting confirmation of trend', targetPrice: 960, generatedAt: Date.now() - 1000 * 60 * 95 },
  { id: 'sig5', symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', action: 'BUY', strength: 'Moderate', confidence: 73, reason: 'Volume surge with bullish MACD crossover on daily chart', targetPrice: 1540, generatedAt: Date.now() - 1000 * 60 * 130 },
];

export const MOCK_AI_CONFIDENCE: AIConfidence = {
  overallScore: 78,
  sentiment: 'Bullish',
  marketTrend: 'Uptrend',
  factors: [
    { label: 'Momentum', score: 82 },
    { label: 'Volatility', score: 64 },
    { label: 'Volume Strength', score: 75 },
    { label: 'Sentiment Analysis', score: 88 },
    { label: 'Macro Indicators', score: 71 },
  ],
  summary: 'AI models detect broad-based bullish momentum led by Banking and IT, with healthy volume confirmation and contained volatility.',
  updatedAt: Date.now() - 1000 * 60 * 6,
};

/** Daily account equity vs. invested capital over the trailing N days. */
export function generateEquityCurve(days = 30): EquityPoint[] {
  const rand = seededRandom(7331);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const invested = MOCK_PORTFOLIO_HOLDINGS.reduce((acc, h) => acc + h.quantity * h.avgPrice, 0);
  let equity = invested * 0.97;
  return Array.from({ length: days }, (_, i) => {
    equity = equity * (1 + (rand() - 0.42) * 0.018);
    return {
      timestamp: now - (days - i) * day,
      equity: Math.round(equity),
      invested: Math.round(invested),
    };
  });
}

/** Smoothed portfolio value trend over the trailing N months. */
export function generatePortfolioGrowth(months = 9): GrowthPoint[] {
  const rand = seededRandom(4242);
  const now = Date.now();
  const month = 30 * 24 * 60 * 60 * 1000;
  let value = 180000;
  return Array.from({ length: months }, (_, i) => {
    value = value * (1 + 0.025 + (rand() - 0.35) * 0.03);
    return {
      timestamp: now - (months - i) * month,
      value: Math.round(value),
    };
  });
}

/** Daily realized P&L over the trailing N trading days. */
export function generateDailyPnL(days = 14): DailyPnLPoint[] {
  const rand = seededRandom(9119);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return Array.from({ length: days }, (_, i) => {
    const timestamp = now - (days - 1 - i) * day;
    const pnl = Math.round((rand() - 0.42) * 9000);
    return {
      label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(timestamp)),
      timestamp,
      pnl,
    };
  });
}

/** Portfolio allocation by sector, derived from current holdings. */
export function getSectorAllocation(): SectorAllocation[] {
  const bySector = new Map<string, number>();
  for (const h of MOCK_PORTFOLIO_HOLDINGS) {
    const stock = MOCK_STOCKS.find((s) => s.symbol === h.symbol);
    if (!stock) continue;
    const value = h.quantity * stock.price;
    bySector.set(stock.sector, (bySector.get(stock.sector) ?? 0) + value);
  }
  const total = Array.from(bySector.values()).reduce((a, v) => a + v, 0);
  return Array.from(bySector.entries())
    .map(([sector, value]) => ({
      sector,
      value: Math.round(value),
      percent: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}
