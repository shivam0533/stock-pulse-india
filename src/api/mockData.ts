import type { Stock, PricePoint } from '@/types';

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

export function getStockHistory(symbol: string, points = 90): PricePoint[] {
  const stock = MOCK_STOCKS.find((s) => s.symbol === symbol);
  if (!stock) return [];
  return generateHistory(stock.price, symbol, points);
}

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
