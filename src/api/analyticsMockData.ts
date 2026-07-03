import type {
  AnalyticsData, AnalyticsPeriod, AnalyticsEquityPoint,
  MonthlyPoint, DailyPoint, TradeDistItem, PerfSummary,
} from '@/types';

// ── Seeded PRNG ───────────────────────────────────────────────────────────────
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ── Equity curve generator ────────────────────────────────────────────────────
function generateEquityCurve(days: number, initial: number, annualReturn: number, annualVol: number): AnalyticsEquityPoint[] {
  const rand = seeded(days * 7 + 1337);
  const dt = 1 / 252;
  const mu = annualReturn * dt;
  const sigma = annualVol * Math.sqrt(dt);
  const now = Date.now();
  const DAY = 86_400_000;

  let equity = initial;
  let peak = initial;
  const points: AnalyticsEquityPoint[] = [];

  for (let i = days; i >= 0; i--) {
    const z = (rand() - 0.5) * 2 * 1.96; // ~normally distributed
    equity = equity * (1 + mu + sigma * z);
    equity = Math.round(equity);
    if (equity > peak) peak = equity;
    const drawdown = Math.round(((equity - peak) / peak) * 10000) / 100;
    points.push({ timestamp: now - i * DAY, equity, drawdown, peak });
  }
  return points;
}

// ── Monthly profit ────────────────────────────────────────────────────────────
function generateMonthlyProfit(months: number): MonthlyPoint[] {
  const rand = seeded(months * 31);
  const MONTHLY_SEEDS = [8234, 12456, -4230, 15678, 9876, 6543, 18234, 11567, -2340, 22345, 14678, 7123];
  const now = new Date('2026-07-01');
  const results: MonthlyPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const base = MONTHLY_SEEDS[i % MONTHLY_SEEDS.length] ?? 10000;
    const profit = Math.round(base * (0.8 + rand() * 0.4));
    const trades = Math.round(20 + rand() * 30);
    const winRate = Math.round(55 + rand() * 25);
    results.push({
      month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      timestamp: d.getTime(),
      profit,
      trades,
      winRate,
    });
  }
  return results;
}

// ── Daily profit ──────────────────────────────────────────────────────────────
function generateDailyProfit(days: number): DailyPoint[] {
  const rand = seeded(days * 17 + 42);
  const now = Date.now();
  const DAY = 86_400_000;
  let cumulative = 0;
  const results: DailyPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const ts = now - i * DAY;
    const rawProfit = Math.round((rand() - 0.38) * 8000);
    cumulative += rawProfit;
    results.push({
      label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(ts)),
      timestamp: ts,
      profit: rawProfit,
      cumulative: Math.round(cumulative),
    });
  }
  return results;
}

// ── Trade distribution ────────────────────────────────────────────────────────
function tradeDistribution(total: number): TradeDistItem[] {
  const items: Array<{ bucket: TradeDistItem['bucket']; count: number; color: string }> = [
    { bucket: 'Large Win',   count: Math.round(total * 0.157), color: '#00C896' },
    { bucket: 'Small Win',   count: Math.round(total * 0.289), color: '#22D3EE' },
    { bucket: 'Micro Win',   count: Math.round(total * 0.244), color: '#A78BFA' },
    { bucket: 'Breakeven',   count: Math.round(total * 0.042), color: '#6B7599' },
    { bucket: 'Small Loss',  count: Math.round(total * 0.181), color: '#FB923C' },
    { bucket: 'Large Loss',  count: Math.round(total * 0.087), color: '#FF4D6D' },
  ];
  return items.map((item) => ({
    ...item,
    pct: Math.round((item.count / total) * 1000) / 10,
  }));
}

// ── Period configs ────────────────────────────────────────────────────────────
const PERIODS: Record<AnalyticsPeriod, {
  days: number; months: number; dailyDays: number;
  totalTrades: number; winTrades: number; capital: number;
  annualReturn: number; annualVol: number;
  grossProfit: number; grossLoss: number; maxDrawdown: number; sharpe: number;
}> = {
  '1M':  { days: 30,  months: 1,  dailyDays: 30,  totalTrades: 28,  winTrades: 19, capital: 500000, annualReturn: 0.28, annualVol: 0.11, grossProfit: 14230, grossLoss: 5420,  maxDrawdown: -3.2, sharpe: 1.92 },
  '3M':  { days: 90,  months: 3,  dailyDays: 30,  totalTrades: 87,  winTrades: 60, capital: 500000, annualReturn: 0.25, annualVol: 0.12, grossProfit: 44680, grossLoss: 18340, maxDrawdown: -5.8, sharpe: 1.84 },
  '6M':  { days: 182, months: 6,  dailyDays: 30,  totalTrades: 168, winTrades: 116, capital: 500000, annualReturn: 0.24, annualVol: 0.13, grossProfit: 84320, grossLoss: 34680, maxDrawdown: -7.1, sharpe: 1.76 },
  '1Y':  { days: 365, months: 12, dailyDays: 30,  totalTrades: 287, winTrades: 198, capital: 500000, annualReturn: 0.22, annualVol: 0.14, grossProfit: 184562, grossLoss: 72340, maxDrawdown: -8.4, sharpe: 1.64 },
  'All': { days: 540, months: 12, dailyDays: 30,  totalTrades: 412, winTrades: 284, capital: 500000, annualReturn: 0.21, annualVol: 0.14, grossProfit: 264320, grossLoss: 108450, maxDrawdown: -9.8, sharpe: 1.58 },
};

function buildSummary(p: typeof PERIODS[AnalyticsPeriod]): PerfSummary {
  const lossTrades = p.totalTrades - p.winTrades;
  const netProfit = p.grossProfit - p.grossLoss;
  const finalCapital = p.capital + netProfit;
  const avgWin = Math.round(p.grossProfit / p.winTrades);
  const avgLoss = Math.round(p.grossLoss / lossTrades);
  return {
    totalTrades: p.totalTrades,
    winTrades: p.winTrades,
    lossTrades,
    winRate: Math.round((p.winTrades / p.totalTrades) * 1000) / 10,
    roi: Math.round((netProfit / p.capital) * 1000) / 10,
    grossProfit: p.grossProfit,
    grossLoss: p.grossLoss,
    netProfit,
    maxDrawdown: p.maxDrawdown,
    sharpeRatio: p.sharpe,
    avgWin,
    avgLoss,
    profitFactor: Math.round((p.grossProfit / p.grossLoss) * 100) / 100,
    expectancy: Math.round(netProfit / p.totalTrades),
    initialCapital: p.capital,
    finalCapital,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ['1M', '3M', '6M', '1Y', 'All'];

const _cache = new Map<AnalyticsPeriod, AnalyticsData>();

export function getAnalyticsData(period: AnalyticsPeriod): AnalyticsData {
  if (_cache.has(period)) return _cache.get(period)!;

  const cfg = PERIODS[period];
  const equityCurve = generateEquityCurve(cfg.days, cfg.capital, cfg.annualReturn, cfg.annualVol);
  const summary = buildSummary(cfg);
  const monthlyProfit = generateMonthlyProfit(cfg.months);
  const dailyProfit = generateDailyProfit(cfg.dailyDays);
  const dist = tradeDistribution(cfg.totalTrades);

  const data: AnalyticsData = { period, summary, equityCurve, monthlyProfit, dailyProfit, tradeDistribution: dist };
  _cache.set(period, data);
  return data;
}
