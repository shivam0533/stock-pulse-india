import type {
  Strategy, BotTrade, AlgoOrder, ApiConnection,
  RiskMetric, LogEntry, BotStats,
  DailyRiskSettings, DailyRiskState,
} from '@/types';

const MIN = 60 * 1000;

// ── Strategies ──────────────────────────────────────────────────────────────
export const STRATEGIES: Strategy[] = [
  {
    id: 'momentum', name: 'Momentum Breakout', shortName: 'MOMO',
    description: 'Buys on 52-week high breakout confirmed with 2× avg volume. Sells on RSI overbought or fixed target.',
    timeframe: '15 Min', riskPerTrade: 1.5, maxPositions: 5,
    indicators: ['RSI', 'Volume', 'ATR', '52W High'],
    params: [
      { key: 'breakout_pct', label: 'Breakout %', value: 0.5, unit: '%' },
      { key: 'vol_mult', label: 'Volume Multiplier', value: 2.0, unit: '×' },
      { key: 'sl_atr', label: 'Stop Loss (ATR)', value: 1.5, unit: '×ATR' },
      { key: 'target_rr', label: 'Target R:R', value: 2.5, unit: '×' },
      { key: 'max_pos', label: 'Max Positions', value: 5 },
    ],
  },
  {
    id: 'mean_rev', name: 'Mean Reversion', shortName: 'MEAN',
    description: 'Fades extreme RSI with Bollinger Band squeeze. Profits from reversion to VWAP after overextension.',
    timeframe: '5 Min', riskPerTrade: 1.0, maxPositions: 3,
    indicators: ['RSI', 'Bollinger', 'VWAP', 'Stochastic'],
    params: [
      { key: 'rsi_os', label: 'RSI Oversold', value: 28 },
      { key: 'rsi_ob', label: 'RSI Overbought', value: 72 },
      { key: 'bb_width', label: 'BB Width Min', value: 0.3, unit: '%' },
      { key: 'target_vwap', label: 'Target', value: 'VWAP' },
      { key: 'max_pos', label: 'Max Positions', value: 3 },
    ],
  },
  {
    id: 'vwap_scalp', name: 'VWAP Scalper', shortName: 'VWAP',
    description: 'High-frequency scalping around VWAP deviation bands. Very tight stops, high win rate target.',
    timeframe: '1 Min', riskPerTrade: 0.5, maxPositions: 2,
    indicators: ['VWAP', 'OBV', 'Tick Volume', 'L2 Depth'],
    params: [
      { key: 'dev_band', label: 'VWAP Deviation', value: 0.2, unit: '%' },
      { key: 'sl_ticks', label: 'Stop Loss', value: 0.1, unit: '%' },
      { key: 'target_ticks', label: 'Target', value: 0.2, unit: '%' },
      { key: 'max_trades', label: 'Max Trades/Day', value: 30 },
      { key: 'max_pos', label: 'Max Positions', value: 2 },
    ],
  },
  {
    id: 'trend_ema', name: 'Trend Following (EMA)', shortName: 'TREND',
    description: 'EMA 9/21 crossover on 15-min chart filtered by ADX > 25 and sector momentum confirmation.',
    timeframe: '15 Min', riskPerTrade: 2.0, maxPositions: 5,
    indicators: ['EMA 9', 'EMA 21', 'ADX', 'Sector Momentum'],
    params: [
      { key: 'fast_ema', label: 'Fast EMA', value: 9 },
      { key: 'slow_ema', label: 'Slow EMA', value: 21 },
      { key: 'adx_min', label: 'ADX Filter', value: 25 },
      { key: 'trail_sl', label: 'Trailing SL', value: 1.0, unit: '×ATR' },
      { key: 'max_pos', label: 'Max Positions', value: 5 },
    ],
  },
  {
    id: 'stat_arb', name: 'Statistical Arbitrage', shortName: 'STATARB',
    description: 'Pair trading between HDFCBANK/ICICIBANK and INFY/TCS. Mean-reverts on z-score > 2 divergence.',
    timeframe: '1 Hour', riskPerTrade: 3.0, maxPositions: 2,
    indicators: ['Z-Score', 'Cointegration', 'Rolling Corr', 'Beta'],
    params: [
      { key: 'entry_z', label: 'Entry Z-Score', value: 2.0, unit: 'σ' },
      { key: 'exit_z', label: 'Exit Z-Score', value: 0.5, unit: 'σ' },
      { key: 'lookback', label: 'Lookback', value: 20, unit: 'bars' },
      { key: 'sl_z', label: 'Stop Z-Score', value: 3.5, unit: 'σ' },
      { key: 'max_pos', label: 'Pair Positions', value: 2 },
    ],
  },
];

// ── Bot Stats ────────────────────────────────────────────────────────────────
export const INITIAL_BOT_STATS: BotStats = {
  uptimeSeconds: 15_738, // ~4h 22m
  todayPnL: 2_486.50,
  todayTrades: 14,
  winTrades: 11,
  lossTrades: 3,
  totalVolume: 48_92_000,
  avgSlippage: 0.08,
  openPositions: 3,
  maxPositions: 5,
};

// ── Running Trades ───────────────────────────────────────────────────────────
export const MOCK_BOT_TRADES: BotTrade[] = [
  {
    id: 'bt1', symbol: 'RELIANCE', name: 'Reliance Industries Ltd',
    side: 'BUY', quantity: 15, entryPrice: 2820.0, currentPrice: 2843.5,
    pnl: 352.5, pnlPct: 0.83, stopLoss: 2760.0, target: 3050.0,
    enteredAt: Date.now() - 92 * MIN, strategySignal: '52W High Breakout',
  },
  {
    id: 'bt2', symbol: 'INFY', name: 'Infosys Ltd',
    side: 'BUY', quantity: 20, entryPrice: 1910.0, currentPrice: 1894.6,
    pnl: -308.0, pnlPct: -0.81, stopLoss: 1860.0, target: 2050.0,
    enteredAt: Date.now() - 47 * MIN, strategySignal: 'VWAP Bounce',
  },
  {
    id: 'bt3', symbol: 'HDFCBANK', name: 'HDFC Bank Ltd',
    side: 'BUY', quantity: 30, entryPrice: 1665.0, currentPrice: 1687.8,
    pnl: 684.0, pnlPct: 1.37, stopLoss: 1630.0, target: 1820.0,
    enteredAt: Date.now() - 168 * MIN, strategySignal: 'EMA Crossover',
  },
];

// ── Open Orders ──────────────────────────────────────────────────────────────
export const MOCK_ALGO_ORDERS: AlgoOrder[] = [
  {
    id: 'ao1', symbol: 'WIPRO', side: 'BUY', orderType: 'LIMIT',
    status: 'PENDING', quantity: 80, filledQty: 0, price: 538.0,
    placedAt: Date.now() - 8 * MIN, reason: 'Bollinger squeeze breakout entry',
  },
  {
    id: 'ao2', symbol: 'AXISBANK', side: 'BUY', orderType: 'LIMIT',
    status: 'PARTIAL', quantity: 50, filledQty: 22, price: 1138.5,
    placedAt: Date.now() - 19 * MIN, reason: 'Mean reversion RSI 28 oversold',
  },
  {
    id: 'ao3', symbol: 'RELIANCE', side: 'SELL', orderType: 'SL',
    status: 'OPEN', quantity: 15, filledQty: 0, price: 2760.0,
    placedAt: Date.now() - 92 * MIN, reason: 'Stop-loss order for long position',
  },
  {
    id: 'ao4', symbol: 'SUNPHARMA', side: 'BUY', orderType: 'LIMIT',
    status: 'PENDING', quantity: 12, filledQty: 0, price: 1720.0,
    placedAt: Date.now() - 3 * MIN, reason: 'Momentum breakout above 52W high',
  },
];

// ── API Connections ──────────────────────────────────────────────────────────
export const MOCK_API_CONNECTIONS: ApiConnection[] = [
  {
    id: 'api1', name: 'Broker API', description: 'Zerodha Kite Connect v3',
    status: 'connected', latencyMs: 4, lastCheck: Date.now() - 1200,
    endpoint: 'api.kite.trade',
  },
  {
    id: 'api2', name: 'Market Feed', description: 'NSE Level-1 WebSocket',
    status: 'connected', latencyMs: 2, lastCheck: Date.now() - 800,
    endpoint: 'wss://ws.kite.trade',
  },
  {
    id: 'api3', name: 'Order Gateway', description: 'FIX 4.4 Order Routing',
    status: 'degraded', latencyMs: 38, lastCheck: Date.now() - 5000,
    endpoint: 'fix.nseindia.com',
  },
  {
    id: 'api4', name: 'Historical Data', description: 'Kite Historical API',
    status: 'connected', latencyMs: 11, lastCheck: Date.now() - 2000,
    endpoint: 'api.kite.trade/instruments',
  },
];

// ── Risk Metrics ─────────────────────────────────────────────────────────────
export const MOCK_RISK_METRICS: RiskMetric[] = [
  { label: 'Capital at Risk', current: 1.8, max: 3.0, unit: '%', status: 'safe' },
  { label: 'Position Slots', current: 3, max: 5, unit: 'pos', status: 'safe' },
  { label: 'Daily Drawdown', current: 0.4, max: 1.5, unit: '%', status: 'safe' },
  { label: 'Order Frequency', current: 14, max: 20, unit: '/day', status: 'warning' },
  { label: 'Margin Used', current: 68, max: 80, unit: '%', status: 'warning' },
];

// ── Seed Log Entries ─────────────────────────────────────────────────────────
export function buildInitialLogs(): LogEntry[] {
  const now = Date.now();
  return [
    { id: 'l01', timestamp: now - 265 * MIN, level: 'SYS',  message: 'Algo engine v2.4.1 started. Loading strategy: Momentum Breakout' },
    { id: 'l02', timestamp: now - 264 * MIN, level: 'SYS',  message: 'Connected to Zerodha Kite API. Token refreshed successfully.' },
    { id: 'l03', timestamp: now - 263 * MIN, level: 'INFO', message: 'NSE market data feed active — 2,183 instruments subscribed.' },
    { id: 'l04', timestamp: now - 240 * MIN, level: 'INFO', message: 'Scanner running: 0 signals in first pass. Waiting for market open.' },
    { id: 'l05', timestamp: now - 200 * MIN, level: 'INFO', message: '[HDFCBANK] EMA crossover detected on 15-min chart. ADX: 28.4.', symbol: 'HDFCBANK' },
    { id: 'l06', timestamp: now - 168 * MIN, level: 'EXEC', message: '[HDFCBANK] BUY 30 @ ₹1,665.00 LIMIT. Order ID: KT-20094812.', symbol: 'HDFCBANK', orderId: 'KT-20094812' },
    { id: 'l07', timestamp: now - 167 * MIN, level: 'EXEC', message: '[HDFCBANK] Order FILLED: 30 qty @ ₹1,665.00. Position open.', symbol: 'HDFCBANK' },
    { id: 'l08', timestamp: now - 155 * MIN, level: 'INFO', message: '[HDFCBANK] Trailing SL placed @ ₹1,630.00 (ATR-based).', symbol: 'HDFCBANK' },
    { id: 'l09', timestamp: now - 130 * MIN, level: 'WARN', message: 'Margin utilisation crossed 60%. Reducing new position size by 20%.' },
    { id: 'l10', timestamp: now - 100 * MIN, level: 'INFO', message: '[RELIANCE] 52W High breakout: ₹2,843.50 on 1.8× avg volume.', symbol: 'RELIANCE' },
    { id: 'l11', timestamp: now - 92 * MIN,  level: 'EXEC', message: '[RELIANCE] BUY 15 @ ₹2,820.00 LIMIT. Order ID: KT-20095441.', symbol: 'RELIANCE', orderId: 'KT-20095441' },
    { id: 'l12', timestamp: now - 91 * MIN,  level: 'EXEC', message: '[RELIANCE] Order FILLED: 15 qty @ ₹2,820.00. Slippage: 0.04%.', symbol: 'RELIANCE' },
    { id: 'l13', timestamp: now - 78 * MIN,  level: 'INFO', message: 'Risk check passed: Portfolio heat 1.6%. Within safe limits.' },
    { id: 'l14', timestamp: now - 60 * MIN,  level: 'INFO', message: '[TCS] Signal generated: Bearish MACD divergence. No action — SELL disabled.', symbol: 'TCS' },
    { id: 'l15', timestamp: now - 47 * MIN,  level: 'INFO', message: '[INFY] VWAP bounce confirmed. RSI: 42.1, Price: ₹1,910.00.', symbol: 'INFY' },
    { id: 'l16', timestamp: now - 47 * MIN,  level: 'EXEC', message: '[INFY] BUY 20 @ ₹1,910.00 MARKET. Order ID: KT-20096103.', symbol: 'INFY', orderId: 'KT-20096103' },
    { id: 'l17', timestamp: now - 30 * MIN,  level: 'WARN', message: '[INFY] Price dipped 0.5% below entry. Monitoring SL at ₹1,860.00.', symbol: 'INFY' },
    { id: 'l18', timestamp: now - 19 * MIN,  level: 'EXEC', message: '[AXISBANK] Partial BUY: 22/50 filled @ ₹1,138.50. Waiting for rest.', symbol: 'AXISBANK' },
    { id: 'l19', timestamp: now - 8 * MIN,   level: 'EXEC', message: '[WIPRO] BUY 80 @ ₹538.00 LIMIT placed. Breakout watch active.', symbol: 'WIPRO' },
    { id: 'l20', timestamp: now - 3 * MIN,   level: 'INFO', message: '[SUNPHARMA] Momentum breakout signal. Entry order queued.', symbol: 'SUNPHARMA' },
    { id: 'l21', timestamp: now - 3 * MIN,   level: 'EXEC', message: '[SUNPHARMA] BUY 12 @ ₹1,720.00 LIMIT placed. Order ID: KT-20096788.', symbol: 'SUNPHARMA', orderId: 'KT-20096788' },
    { id: 'l22', timestamp: now - 45000,     level: 'INFO', message: 'Heartbeat OK. Uptime: 4h 22m. Open positions: 3.' },
  ];
}

// ── Live log messages pool ────────────────────────────────────────────────────
const LIVE_LOG_POOL: Omit<LogEntry, 'id' | 'timestamp'>[] = [
  { level: 'INFO', message: 'Scanner pass complete — 1,842 instruments screened in 0.3s.' },
  { level: 'INFO', message: '[HDFCBANK] Unrealised P&L updated: +₹684.00 (+1.37%).', symbol: 'HDFCBANK' },
  { level: 'INFO', message: 'Heartbeat OK. Latency: Broker 4ms, Feed 2ms.' },
  { level: 'INFO', message: '[RELIANCE] Trailing SL updated to ₹2,790.00 (+1.1% from entry).', symbol: 'RELIANCE' },
  { level: 'WARN', message: '[AXISBANK] Order partially filled — waiting for remaining 28 qty.', symbol: 'AXISBANK' },
  { level: 'INFO', message: 'Risk snapshot: Capital at risk 1.8%, Daily DD 0.4%. All safe.' },
  { level: 'INFO', message: '[WIPRO] Order depth: 2,400 qty bid at ₹537.95. Entry imminent.', symbol: 'WIPRO' },
  { level: 'EXEC', message: '[HDFCBANK] Target revised up to ₹1,830.00 (trailing profit).', symbol: 'HDFCBANK' },
  { level: 'INFO', message: 'Market breadth: Advances 1,243 / Declines 788. Bullish bias.' },
  { level: 'WARN', message: 'Order gateway latency spike: 38ms (threshold: 20ms). Monitoring.' },
  { level: 'SYS',  message: 'Strategy parameters reloaded from config. No change detected.' },
  { level: 'INFO', message: '[SUNPHARMA] Awaiting order fill. Current ask: ₹1,721.50.', symbol: 'SUNPHARMA' },
];

// ── Daily Risk Management Defaults ───────────────────────────────────────────
export const DEFAULT_RISK_SETTINGS: DailyRiskSettings = {
  maxTradesPerDay: 10,
  maxDailyLosses: 4,
  riskPerTrade: 1.5,
  autoStop: true,
};

// Start at warning state (lossTrades = 3, one away from limit of 4)
// so the UI immediately shows risk warning and user can see limit trigger live.
export const INITIAL_DAILY_RISK_STATE: DailyRiskState = {
  date: new Date().toISOString().split('T')[0],
  totalTrades: 7,
  winTrades: 4,
  lossTrades: 3,
  dailyPnL: 1246.50,
  tradingEnabled: true,
  riskStatus: 'warning',
  limitReachedAt: null,
  resetAt: null,
};

// Mock symbols used for simulated trade closures
export const MOCK_CLOSE_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'AXISBANK'];

let liveLogIdx = 0;
let liveLogCounter = 23;

export function nextLiveLog(): LogEntry {
  const entry = LIVE_LOG_POOL[liveLogIdx % LIVE_LOG_POOL.length];
  liveLogIdx++;
  liveLogCounter++;
  return { ...entry, id: `live-${liveLogCounter}`, timestamp: Date.now() };
}
