/**
 * Pure, demo-data-only chart math for the AI Dashboard's TradingView-style
 * chart. No network calls, no backend — every series here is generated
 * client-side from the current option premium so the chart still looks
 * anchored to something real, plus standard, textbook technical-analysis
 * formulas (EMA/VWAP/RSI/MACD). Illustrative only.
 */

export interface ChartCandle {
  time: number;
  price: number;
  volume: number;
}

export type CrossoverType = 'BUY' | 'SELL';

export interface CrossoverMarker {
  index: number;
  time: number;
  price: number;
  type: CrossoverType;
}

export interface DashboardChartData {
  series: ChartCandle[];
  ema: number[];
  vwap: number[];
  rsi: number[];
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
  support: number;
  resistance: number;
  markers: CrossoverMarker[];
}

const POINTS = 80;
const INTERVAL_MS = 60_000; // 1-minute candles

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateSeries(currentPrice: number): ChartCandle[] {
  const now = Date.now();
  const series: ChartCandle[] = [];
  let price = currentPrice * rand(0.94, 0.98);

  for (let i = 0; i < POINTS; i++) {
    const drift = (Math.random() - 0.47) * currentPrice * 0.012;
    price = Math.max(currentPrice * 0.85, price + drift);
    series.push({
      time: now - (POINTS - 1 - i) * INTERVAL_MS,
      price: +price.toFixed(2),
      volume: Math.round(rand(400, 2600)),
    });
  }

  // Anchor the last candle to the live premium so the chart reads as "current".
  series[series.length - 1] = { ...series[series.length - 1], price: +currentPrice.toFixed(2) };
  return series;
}

function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  values.forEach((v, i) => {
    ema.push(i === 0 ? v : v * k + ema[i - 1] * (1 - k));
  });
  return ema.map((v) => +v.toFixed(2));
}

function computeVWAP(series: ChartCandle[]): number[] {
  let cumPV = 0;
  let cumVol = 0;
  return series.map((c) => {
    cumPV += c.price * c.volume;
    cumVol += c.volume;
    return +(cumPV / cumVol).toFixed(2);
  });
}

/** Standard Wilder's-smoothed RSI. */
function computeRSI(values: number[], period = 14): number[] {
  const rsi = new Array(values.length).fill(50);
  if (values.length <= period) return rsi;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    avgGain += Math.max(change, 0);
    avgLoss += Math.max(-change, 0);
  }
  avgGain /= period;
  avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  for (let i = 0; i < period; i++) rsi[i] = rsi[period];
  return rsi.map((v) => +v.toFixed(1));
}

function computeMACD(values: number[]) {
  const ema12 = computeEMA(values, 12);
  const ema26 = computeEMA(values, 26);
  const macdLine = values.map((_, i) => +(ema12[i] - ema26[i]).toFixed(3));
  const signalLine = computeEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => +(v - signalLine[i]).toFixed(3));
  return { macdLine, signalLine, histogram };
}

/** EMA-crossover points, capped to the most recent BUY and SELL so the chart doesn't get cluttered. */
function findCrossovers(series: ChartCandle[], ema: number[]): CrossoverMarker[] {
  const all: CrossoverMarker[] = [];
  for (let i = 1; i < series.length; i++) {
    const prevAbove = series[i - 1].price > ema[i - 1];
    const nowAbove = series[i].price > ema[i];
    if (!prevAbove && nowAbove) {
      all.push({ index: i, time: series[i].time, price: series[i].price, type: 'BUY' });
    } else if (prevAbove && !nowAbove) {
      all.push({ index: i, time: series[i].time, price: series[i].price, type: 'SELL' });
    }
  }
  const lastBuy = [...all].reverse().find((m) => m.type === 'BUY');
  const lastSell = [...all].reverse().find((m) => m.type === 'SELL');
  return [lastBuy, lastSell].filter((m): m is CrossoverMarker => !!m);
}

export function buildDashboardChart(currentPrice: number): DashboardChartData {
  const series = generateSeries(currentPrice);
  const prices = series.map((c) => c.price);
  const ema = computeEMA(prices, 20);
  const vwap = computeVWAP(series);
  const rsi = computeRSI(prices);
  const { macdLine, signalLine, histogram } = computeMACD(prices);
  const recentWindow = prices.slice(-30);

  return {
    series,
    ema,
    vwap,
    rsi,
    macdLine,
    signalLine,
    histogram,
    support: +Math.min(...recentWindow).toFixed(2),
    resistance: +Math.max(...recentWindow).toFixed(2),
    markers: findCrossovers(series, ema),
  };
}
