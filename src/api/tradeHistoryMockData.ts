import type { TradeRecord } from '@/types';

const D = 86_400_000;
const now = new Date('2026-07-01').getTime();

function t(record: Omit<TradeRecord, 'id' | 'netPnL' | 'holdingDays'>): TradeRecord {
  const netPnL = record.profit > 0 ? record.profit - record.charges : -(record.loss + record.charges);
  const holdingDays = record.exitDate
    ? Math.round((record.exitDate - record.entryDate) / D)
    : Math.round((now - record.entryDate) / D);
  return { ...record, id: `TH-${record.entryDate}-${record.symbol}`, netPnL, holdingDays };
}

export const MOCK_TRADES: TradeRecord[] = [
  t({ entryDate: now - 1 * D,  exitDate: now,          symbol: 'RELIANCE',   name: 'Reliance Industries',   sector: 'Energy',         strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 15,  entryPrice: 2820.0,  exitPrice: 2843.5,  profit: 352.50,  loss: 0,        charges: 38.4,  status: 'WIN' }),
  t({ entryDate: now - 2 * D,  exitDate: now - 1 * D,  symbol: 'INFY',       name: 'Infosys Ltd',           sector: 'IT',             strategy: 'VWAP Scalper',         side: 'SHORT', quantity: 20,  entryPrice: 1910.0,  exitPrice: 1894.6,  profit: 308.00,  loss: 0,        charges: 27.6,  status: 'WIN' }),
  t({ entryDate: now - 3 * D,  exitDate: now - 2 * D,  symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',         sector: 'Banking',        strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 30,  entryPrice: 1665.0,  exitPrice: 1687.8,  profit: 684.00,  loss: 0,        charges: 54.2,  status: 'WIN' }),
  t({ entryDate: now - 4 * D,  exitDate: now - 3 * D,  symbol: 'TCS',        name: 'Tata Consultancy',      sector: 'IT',             strategy: 'Mean Reversion',       side: 'SHORT', quantity: 10,  entryPrice: 4180.0,  exitPrice: 4290.0,  profit: 0,       loss: 1100.00,  charges: 61.8,  status: 'LOSS' }),
  t({ entryDate: now - 5 * D,  exitDate: now - 4 * D,  symbol: 'WIPRO',      name: 'Wipro Ltd',             sector: 'IT',             strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 80,  entryPrice: 524.0,   exitPrice: 543.2,   profit: 1536.00, loss: 0,        charges: 68.4,  status: 'WIN' }),
  t({ entryDate: now - 6 * D,  exitDate: now - 5 * D,  symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical',    sector: 'Pharma',         strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 12,  entryPrice: 1698.0,  exitPrice: 1734.5,  profit: 438.00,  loss: 0,        charges: 30.4,  status: 'WIN' }),
  t({ entryDate: now - 7 * D,  exitDate: now - 6 * D,  symbol: 'AXISBANK',   name: 'Axis Bank Ltd',         sector: 'Banking',        strategy: 'Mean Reversion',       side: 'LONG',  quantity: 50,  entryPrice: 1158.0,  exitPrice: 1142.3,  profit: 0,       loss: 785.00,   charges: 51.2,  status: 'LOSS' }),
  t({ entryDate: now - 9 * D,  exitDate: now - 7 * D,  symbol: 'MARUTI',     name: 'Maruti Suzuki India',   sector: 'Auto',           strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 5,   entryPrice: 12100.0, exitPrice: 12340.6, profit: 1203.00, loss: 0,        charges: 84.6,  status: 'WIN' }),
  t({ entryDate: now - 11 * D, exitDate: now - 9 * D,  symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',        sector: 'Banking',        strategy: 'VWAP Scalper',         side: 'LONG',  quantity: 40,  entryPrice: 1215.0,  exitPrice: 1234.5,  profit: 780.00,  loss: 0,        charges: 56.8,  status: 'WIN' }),
  t({ entryDate: now - 13 * D, exitDate: now - 11 * D, symbol: 'LT',         name: 'Larsen & Toubro',       sector: 'Infrastructure', strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 8,   entryPrice: 3580.0,  exitPrice: 3672.4,  profit: 739.20,  loss: 0,        charges: 47.8,  status: 'WIN' }),
  t({ entryDate: now - 15 * D, exitDate: now - 13 * D, symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank',   sector: 'Banking',        strategy: 'Mean Reversion',       side: 'SHORT', quantity: 18,  entryPrice: 1820.0,  exitPrice: 1789.5,  profit: 549.00,  loss: 0,        charges: 39.2,  status: 'WIN' }),
  t({ entryDate: now - 17 * D, exitDate: now - 15 * D, symbol: 'RELIANCE',   name: 'Reliance Industries',   sector: 'Energy',         strategy: 'VWAP Scalper',         side: 'SHORT', quantity: 10,  entryPrice: 2860.0,  exitPrice: 2843.5,  profit: 165.00,  loss: 0,        charges: 22.8,  status: 'WIN' }),
  t({ entryDate: now - 19 * D, exitDate: now - 17 * D, symbol: 'TITAN',      name: 'Titan Company Ltd',     sector: 'FMCG',           strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 10,  entryPrice: 3380.0,  exitPrice: 3456.2,  profit: 762.00,  loss: 0,        charges: 52.4,  status: 'WIN' }),
  t({ entryDate: now - 21 * D, exitDate: now - 19 * D, symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',     sector: 'Banking',        strategy: 'Trend Following (EMA)', side: 'SHORT', quantity: 5,   entryPrice: 6700.0,  exitPrice: 6823.9,  profit: 0,       loss: 619.50,   charges: 53.4,  status: 'LOSS' }),
  t({ entryDate: now - 23 * D, exitDate: now - 21 * D, symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',         sector: 'Banking',        strategy: 'VWAP Scalper',         side: 'LONG',  quantity: 25,  entryPrice: 1670.0,  exitPrice: 1687.8,  profit: 445.00,  loss: 0,        charges: 35.6,  status: 'WIN' }),
  t({ entryDate: now - 25 * D, exitDate: now - 23 * D, symbol: 'ITC',        name: 'ITC Ltd',               sector: 'FMCG',           strategy: 'Mean Reversion',       side: 'LONG',  quantity: 200, entryPrice: 452.0,   exitPrice: 463.85,  profit: 2370.00, loss: 0,        charges: 82.4,  status: 'WIN' }),
  t({ entryDate: now - 28 * D, exitDate: now - 25 * D, symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ',     sector: 'Infrastructure', strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 20,  entryPrice: 1420.0,  exitPrice: 1456.3,  profit: 726.00,  loss: 0,        charges: 48.2,  status: 'WIN' }),
  t({ entryDate: now - 31 * D, exitDate: now - 28 * D, symbol: 'WIPRO',      name: 'Wipro Ltd',             sector: 'IT',             strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 60,  entryPrice: 535.0,   exitPrice: 543.2,   profit: 492.00,  loss: 0,        charges: 38.8,  status: 'WIN' }),
  t({ entryDate: now - 34 * D, exitDate: now - 31 * D, symbol: 'INFY',       name: 'Infosys Ltd',           sector: 'IT',             strategy: 'VWAP Scalper',         side: 'SHORT', quantity: 25,  entryPrice: 1920.0,  exitPrice: 1940.0,  profit: 0,       loss: 500.00,   charges: 44.6,  status: 'LOSS' }),
  t({ entryDate: now - 37 * D, exitDate: now - 34 * D, symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical',    sector: 'Pharma',         strategy: 'Mean Reversion',       side: 'LONG',  quantity: 15,  entryPrice: 1710.0,  exitPrice: 1734.5,  profit: 367.50,  loss: 0,        charges: 28.8,  status: 'WIN' }),
  t({ entryDate: now - 40 * D, exitDate: now - 37 * D, symbol: 'TCS',        name: 'Tata Consultancy',      sector: 'IT',             strategy: 'Momentum Breakout',    side: 'SHORT', quantity: 8,   entryPrice: 4220.0,  exitPrice: 4156.2,  profit: 510.40,  loss: 0,        charges: 36.2,  status: 'WIN' }),
  t({ entryDate: now - 44 * D, exitDate: now - 40 * D, symbol: 'MARUTI',     name: 'Maruti Suzuki India',   sector: 'Auto',           strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 4,   entryPrice: 12200.0, exitPrice: 12340.6, profit: 562.40,  loss: 0,        charges: 42.6,  status: 'WIN' }),
  t({ entryDate: now - 48 * D, exitDate: now - 44 * D, symbol: 'RELIANCE',   name: 'Reliance Industries',   sector: 'Energy',         strategy: 'Mean Reversion',       side: 'LONG',  quantity: 12,  entryPrice: 2800.0,  exitPrice: 2780.0,  profit: 0,       loss: 240.00,   charges: 24.4,  status: 'LOSS' }),
  t({ entryDate: now - 52 * D, exitDate: now - 48 * D, symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',        sector: 'Banking',        strategy: 'VWAP Scalper',         side: 'LONG',  quantity: 35,  entryPrice: 1205.0,  exitPrice: 1234.5,  profit: 1032.50, loss: 0,        charges: 59.2,  status: 'WIN' }),
  t({ entryDate: now - 56 * D, exitDate: now - 52 * D, symbol: 'AXISBANK',   name: 'Axis Bank Ltd',         sector: 'Banking',        strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 45,  entryPrice: 1110.0,  exitPrice: 1142.3,  profit: 1453.50, loss: 0,        charges: 67.4,  status: 'WIN' }),
  t({ entryDate: now - 60 * D, exitDate: now - 56 * D, symbol: 'LT',         name: 'Larsen & Toubro',       sector: 'Infrastructure', strategy: 'Mean Reversion',       side: 'SHORT', quantity: 6,   entryPrice: 3700.0,  exitPrice: 3672.4,  profit: 165.60,  loss: 0,        charges: 18.4,  status: 'WIN' }),
  t({ entryDate: now - 65 * D, exitDate: now - 60 * D, symbol: 'TITAN',      name: 'Titan Company Ltd',     sector: 'FMCG',           strategy: 'Trend Following (EMA)', side: 'SHORT', quantity: 8,   entryPrice: 3500.0,  exitPrice: 3456.2,  profit: 350.40,  loss: 0,        charges: 24.2,  status: 'WIN' }),
  t({ entryDate: now - 70 * D, exitDate: now - 65 * D, symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank',   sector: 'Banking',        strategy: 'VWAP Scalper',         side: 'LONG',  quantity: 22,  entryPrice: 1760.0,  exitPrice: 1740.0,  profit: 0,       loss: 440.00,   charges: 36.6,  status: 'LOSS' }),
  t({ entryDate: now - 75 * D, exitDate: now - 70 * D, symbol: 'ITC',        name: 'ITC Ltd',               sector: 'FMCG',           strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 150, entryPrice: 448.0,   exitPrice: 463.85,  profit: 2377.50, loss: 0,        charges: 78.4,  status: 'WIN' }),
  // Open trades
  t({ entryDate: now - 2 * D,  exitDate: null,          symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',     sector: 'Banking',        strategy: 'Trend Following (EMA)', side: 'LONG',  quantity: 7,   entryPrice: 6780.0,  exitPrice: null,    profit: 0,       loss: 0,        charges: 0,     status: 'OPEN' }),
  t({ entryDate: now - 1 * D,  exitDate: null,          symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ',     sector: 'Infrastructure', strategy: 'Momentum Breakout',    side: 'LONG',  quantity: 15,  entryPrice: 1448.0,  exitPrice: null,    profit: 0,       loss: 0,        charges: 0,     status: 'OPEN' }),
].sort((a, b) => b.entryDate - a.entryDate);

export const TRADE_STRATEGIES = [
  'Momentum Breakout',
  'Mean Reversion',
  'VWAP Scalper',
  'Trend Following (EMA)',
];

export function computeTradeSummary(trades: TradeRecord[]) {
  const closed = trades.filter((t) => t.status !== 'OPEN');
  const wins   = trades.filter((t) => t.status === 'WIN');
  const losses = trades.filter((t) => t.status === 'LOSS');
  const open   = trades.filter((t) => t.status === 'OPEN');
  const totalProfit  = wins.reduce((s, t) => s + t.profit, 0);
  const totalLoss    = losses.reduce((s, t) => s + t.loss, 0);
  const totalCharges = closed.reduce((s, t) => s + t.charges, 0);
  return {
    total:       trades.length,
    wins:        wins.length,
    losses:      losses.length,
    open:        open.length,
    winRate:     closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
    totalProfit,
    totalLoss,
    totalCharges,
    netPnL:      totalProfit - totalLoss - totalCharges,
    avgWin:      wins.length  ? Math.round(totalProfit / wins.length) : 0,
    avgLoss:     losses.length ? Math.round(totalLoss / losses.length) : 0,
  };
}

/** Generate CSV content from a list of trade records */
export function exportTradesCSV(trades: TradeRecord[]): string {
  const header = [
    'ID', 'Entry Date', 'Exit Date', 'Symbol', 'Name', 'Sector',
    'Strategy', 'Side', 'Qty', 'Entry Price', 'Exit Price',
    'Profit', 'Loss', 'Net P&L', 'Charges', 'Holding Days', 'Status',
  ].join(',');

  const fmt = (ts: number | null) =>
    ts ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts)) : '-';

  const rows = trades.map((t) =>
    [
      t.id, fmt(t.entryDate), fmt(t.exitDate),
      t.symbol, `"${t.name}"`, t.sector,
      `"${t.strategy}"`, t.side, t.quantity,
      t.entryPrice.toFixed(2),
      t.exitPrice?.toFixed(2) ?? '-',
      t.profit.toFixed(2), t.loss.toFixed(2),
      t.netPnL.toFixed(2), t.charges.toFixed(2),
      t.holdingDays, t.status,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
