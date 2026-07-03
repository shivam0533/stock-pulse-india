import type { DetailedSignal, SignalIndicator, SignalFilterState } from '@/types';

const MIN = 60 * 1000;

function ind(name: string, status: SignalIndicator['status'], value: string): SignalIndicator {
  return { name, status, value };
}

function rr(entry: number, target: number, sl: number): number {
  return Math.round(Math.abs(target - entry) / Math.abs(entry - sl) * 10) / 10;
}

export const MOCK_DETAILED_SIGNALS: DetailedSignal[] = [
  /* ── BUY Signals ──────────────────────────────────────────────────── */
  {
    id: 's01', symbol: 'RELIANCE', name: 'Reliance Industries Ltd',
    sector: 'Energy', action: 'BUY', strength: 'Strong', confidence: 87,
    riskLevel: 'Low', entry: 2843.5, target: 3100, stopLoss: 2760,
    riskReward: rr(2843.5, 3100, 2760),
    reason: 'Bullish breakout above 50-DMA on high volume. RSI at 58 with room to run. Jio subscriber additions boosting revenue outlook.',
    indicators: [
      ind('RSI', 'bullish', '58.4 – Positive'),
      ind('MACD', 'bullish', 'Bullish crossover'),
      ind('EMA Cross', 'bullish', '20 > 50 > 200'),
      ind('Volume', 'bullish', '1.8× avg volume'),
      ind('Bollinger', 'neutral', 'Mid-band breakout'),
    ],
    generatedAt: Date.now() - 18 * MIN, expiresAt: Date.now() + 6 * 60 * MIN, isNew: true,
  },
  {
    id: 's02', symbol: 'INFY', name: 'Infosys Ltd',
    sector: 'IT', action: 'BUY', strength: 'Strong', confidence: 81,
    riskLevel: 'Low', entry: 1894.6, target: 2050, stopLoss: 1840,
    riskReward: rr(1894.6, 2050, 1840),
    reason: 'Positive earnings surprise with deal wins accelerating. IT sector rotation confirmed. MACD golden cross forming.',
    indicators: [
      ind('RSI', 'bullish', '61.2 – Strong'),
      ind('MACD', 'bullish', 'Golden cross'),
      ind('EMA Cross', 'bullish', '20 > 50 EMA'),
      ind('Volume', 'bullish', '2.1× avg volume'),
      ind('ADX', 'bullish', 'ADX: 28 – Trend strong'),
    ],
    generatedAt: Date.now() - 35 * MIN, expiresAt: Date.now() + 5 * 60 * MIN, isNew: false,
  },
  {
    id: 's03', symbol: 'HDFCBANK', name: 'HDFC Bank Ltd',
    sector: 'Banking', action: 'BUY', strength: 'Strong', confidence: 84,
    riskLevel: 'Low', entry: 1687.8, target: 1820, stopLoss: 1640,
    riskReward: rr(1687.8, 1820, 1640),
    reason: 'NIM expansion expectations post RBI policy. Banking sector momentum led by credit growth. Key support held at 1640.',
    indicators: [
      ind('RSI', 'bullish', '55.8 – Healthy'),
      ind('MACD', 'bullish', 'Positive divergence'),
      ind('EMA Cross', 'bullish', 'Above 200 EMA'),
      ind('Bollinger', 'neutral', 'Upper-mid band'),
      ind('Stochastic', 'bullish', '%K crossover'),
    ],
    generatedAt: Date.now() - 52 * MIN, expiresAt: Date.now() + 4 * 60 * MIN, isNew: false,
  },
  {
    id: 's04', symbol: 'ICICIBANK', name: 'ICICI Bank Ltd',
    sector: 'Banking', action: 'BUY', strength: 'Moderate', confidence: 73,
    riskLevel: 'Low', entry: 1234.5, target: 1350, stopLoss: 1195,
    riskReward: rr(1234.5, 1350, 1195),
    reason: 'Strong Q1 results with RoE expansion. FII net buyers for 3 consecutive sessions. Relative strength vs Nifty Bank index.',
    indicators: [
      ind('RSI', 'bullish', '62.1 – Momentum'),
      ind('MACD', 'neutral', 'Flattening – watch'),
      ind('EMA Cross', 'bullish', '50 > 200 EMA'),
      ind('Volume', 'bullish', '1.5× avg volume'),
      ind('ADX', 'neutral', 'ADX: 22 – Moderate'),
    ],
    generatedAt: Date.now() - 70 * MIN, expiresAt: Date.now() + 3 * 60 * MIN, isNew: false,
  },
  {
    id: 's05', symbol: 'WIPRO', name: 'Wipro Ltd',
    sector: 'IT', action: 'BUY', strength: 'Moderate', confidence: 68,
    riskLevel: 'Medium', entry: 543.2, target: 590, stopLoss: 525,
    riskReward: rr(543.2, 590, 525),
    reason: 'Ascending triangle breakout with increased delivery volume. Cloud and AI services pipeline growing. Q2 guidance strong.',
    indicators: [
      ind('RSI', 'bullish', '57.3 – Uptrend'),
      ind('MACD', 'bullish', 'Histogram expanding'),
      ind('Bollinger', 'bullish', 'Upper band touch'),
      ind('Volume', 'neutral', '1.1× avg volume'),
      ind('Stochastic', 'neutral', 'Mid-range'),
    ],
    generatedAt: Date.now() - 95 * MIN, expiresAt: Date.now() + 3 * 60 * MIN, isNew: false,
  },
  {
    id: 's06', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical',
    sector: 'Pharma', action: 'BUY', strength: 'Strong', confidence: 82,
    riskLevel: 'Low', entry: 1734.5, target: 1900, stopLoss: 1680,
    riskReward: rr(1734.5, 1900, 1680),
    reason: 'US FDA inspection clearance for key plant. Specialty pharma pipeline expansion. Export growth momentum continues.',
    indicators: [
      ind('RSI', 'bullish', '60.4 – Healthy'),
      ind('MACD', 'bullish', 'Signal line cross'),
      ind('EMA Cross', 'bullish', 'All EMAs aligned'),
      ind('Volume', 'bullish', '2.4× avg volume'),
      ind('ADX', 'bullish', 'ADX: 32 – Strong trend'),
    ],
    generatedAt: Date.now() - 23 * MIN, expiresAt: Date.now() + 5 * 60 * MIN, isNew: true,
  },
  {
    id: 's07', symbol: 'TITAN', name: 'Titan Company Ltd',
    sector: 'FMCG', action: 'BUY', strength: 'Moderate', confidence: 75,
    riskLevel: 'Medium', entry: 3456.2, target: 3750, stopLoss: 3350,
    riskReward: rr(3456.2, 3750, 3350),
    reason: 'Festive season demand outlook positive. Jewellery segment showing robust volume growth. Premium segment outperforming.',
    indicators: [
      ind('RSI', 'bullish', '58.9 – Uptrend'),
      ind('MACD', 'neutral', 'Slightly positive'),
      ind('EMA Cross', 'bullish', '20 EMA crossing 50'),
      ind('Bollinger', 'bullish', 'Squeeze breakout'),
      ind('Volume', 'bullish', '1.7× avg volume'),
    ],
    generatedAt: Date.now() - 110 * MIN, expiresAt: Date.now() + 2 * 60 * MIN, isNew: false,
  },
  {
    id: 's08', symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ',
    sector: 'Infrastructure', action: 'BUY', strength: 'Moderate', confidence: 71,
    riskLevel: 'Medium', entry: 1456.3, target: 1590, stopLoss: 1405,
    riskReward: rr(1456.3, 1590, 1405),
    reason: 'Volume surge with MACD crossover on daily chart. Infrastructure spending push driving port expansion. Q1 cargo data strong.',
    indicators: [
      ind('RSI', 'bullish', '62.8 – Momentum'),
      ind('MACD', 'bullish', 'MACD crossover'),
      ind('EMA Cross', 'neutral', 'Testing 50 EMA'),
      ind('Volume', 'bullish', '1.9× avg volume'),
      ind('ADX', 'bullish', 'ADX: 26 – Trend forming'),
    ],
    generatedAt: Date.now() - 130 * MIN, expiresAt: Date.now() + 1.5 * 60 * MIN, isNew: false,
  },
  {
    id: 's09', symbol: 'LT', name: 'Larsen & Toubro Ltd',
    sector: 'Infrastructure', action: 'BUY', strength: 'Strong', confidence: 88,
    riskLevel: 'Low', entry: 3672.4, target: 4000, stopLoss: 3560,
    riskReward: rr(3672.4, 4000, 3560),
    reason: 'Order inflow at record high. Hydro/renewable project wins boosting backlog. Margin guidance revised upward. FII inflows rising.',
    indicators: [
      ind('RSI', 'bullish', '64.1 – Strong'),
      ind('MACD', 'bullish', 'Strong momentum'),
      ind('EMA Cross', 'bullish', 'Golden cross confirmed'),
      ind('Volume', 'bullish', '2.8× avg volume'),
      ind('Bollinger', 'bullish', 'Breaking upper band'),
    ],
    generatedAt: Date.now() - 8 * MIN, expiresAt: Date.now() + 7 * 60 * MIN, isNew: true,
  },
  {
    id: 's10', symbol: 'ITC', name: 'ITC Ltd',
    sector: 'FMCG', action: 'BUY', strength: 'Moderate', confidence: 66,
    riskLevel: 'Low', entry: 463.85, target: 505, stopLoss: 450,
    riskReward: rr(463.85, 505, 450),
    reason: 'FMCG segment outperforming. Hotels & Agri tailwinds. GST concerns appear priced in. Dividend yield attractive at current levels.',
    indicators: [
      ind('RSI', 'neutral', '52.3 – Neutral'),
      ind('MACD', 'bullish', 'Positive histogram'),
      ind('EMA Cross', 'bullish', 'Above 200 EMA'),
      ind('Bollinger', 'neutral', 'Mid-band holding'),
      ind('Stochastic', 'bullish', 'Crossover above 20'),
    ],
    generatedAt: Date.now() - 150 * MIN, expiresAt: Date.now() + 2 * 60 * MIN, isNew: false,
  },
  {
    id: 's11', symbol: 'AXISBANK', name: 'Axis Bank Ltd',
    sector: 'Banking', action: 'BUY', strength: 'Moderate', confidence: 74,
    riskLevel: 'Medium', entry: 1142.3, target: 1250, stopLoss: 1100,
    riskReward: rr(1142.3, 1250, 1100),
    reason: 'Below-peer P/B ratio offers discount. Retail loan growth accelerating. Branch expansion strategy gaining traction.',
    indicators: [
      ind('RSI', 'bullish', '59.7 – Upside room'),
      ind('MACD', 'bullish', 'Flipping positive'),
      ind('EMA Cross', 'neutral', 'Testing 20 EMA'),
      ind('Volume', 'neutral', '0.9× avg – watch'),
      ind('ADX', 'bullish', 'ADX: 24 – Building'),
    ],
    generatedAt: Date.now() - 60 * MIN, expiresAt: Date.now() + 3.5 * 60 * MIN, isNew: false,
  },
  {
    id: 's12', symbol: 'MARUTI', name: 'Maruti Suzuki India',
    sector: 'Auto', action: 'BUY', strength: 'Strong', confidence: 83,
    riskLevel: 'Low', entry: 12340.6, target: 13400, stopLoss: 11950,
    riskReward: rr(12340.6, 13400, 11950),
    reason: 'New model launches driving ASP higher. Rural demand revival tailwind. Japan parent tech transfer for hybrid vehicles confirmed.',
    indicators: [
      ind('RSI', 'bullish', '63.4 – Uptrend'),
      ind('MACD', 'bullish', 'Strong crossover'),
      ind('EMA Cross', 'bullish', '20 > 50 > 200'),
      ind('Volume', 'bullish', '2.0× avg volume'),
      ind('Bollinger', 'neutral', 'Mid-upper range'),
    ],
    generatedAt: Date.now() - 42 * MIN, expiresAt: Date.now() + 4 * 60 * MIN, isNew: false,
  },

  /* ── SELL Signals ─────────────────────────────────────────────────── */
  {
    id: 's13', symbol: 'TCS', name: 'Tata Consultancy Services',
    sector: 'IT', action: 'SELL', strength: 'Moderate', confidence: 64,
    riskLevel: 'Medium', entry: 4156.2, target: 3820, stopLoss: 4280,
    riskReward: rr(4156.2, 3820, 4280),
    reason: 'Bearish RSI divergence at 52-week high. US recession fears dampening discretionary IT spend. Margin guidance below consensus.',
    indicators: [
      ind('RSI', 'bearish', '70.1 – Overbought'),
      ind('MACD', 'bearish', 'Bearish divergence'),
      ind('EMA Cross', 'neutral', 'Testing resistance'),
      ind('Volume', 'bearish', 'Low vol at highs'),
      ind('Bollinger', 'bearish', 'Outside upper band'),
    ],
    generatedAt: Date.now() - 45 * MIN, expiresAt: Date.now() + 4 * 60 * MIN, isNew: false,
  },
  {
    id: 's14', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank',
    sector: 'Banking', action: 'SELL', strength: 'Moderate', confidence: 61,
    riskLevel: 'Medium', entry: 1789.5, target: 1640, stopLoss: 1845,
    riskReward: rr(1789.5, 1640, 1845),
    reason: 'MD transition uncertainty weighing on premium valuation. NIM compression risk. High P/B vs peers difficult to sustain.',
    indicators: [
      ind('RSI', 'bearish', '68.9 – Near overbought'),
      ind('MACD', 'bearish', 'Histogram shrinking'),
      ind('EMA Cross', 'neutral', 'At resistance'),
      ind('Volume', 'bearish', 'Declining on rallies'),
      ind('Stochastic', 'bearish', '%K turning down'),
    ],
    generatedAt: Date.now() - 88 * MIN, expiresAt: Date.now() + 3 * 60 * MIN, isNew: false,
  },
  {
    id: 's15', symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',
    sector: 'FMCG', action: 'SELL', strength: 'Moderate', confidence: 67,
    riskLevel: 'Medium', entry: 2456.7, target: 2260, stopLoss: 2535,
    riskReward: rr(2456.7, 2260, 2535),
    reason: 'Volume slowdown in urban markets. Competitive pressure from D2C brands. Raw material cost increase yet to fully reflect.',
    indicators: [
      ind('RSI', 'bearish', '66.5 – Topping out'),
      ind('MACD', 'bearish', 'Bearish crossover'),
      ind('EMA Cross', 'bearish', '20 crossing below 50'),
      ind('Volume', 'bearish', '0.7× avg – distribution'),
      ind('ADX', 'neutral', 'ADX: 18 – Weak trend'),
    ],
    generatedAt: Date.now() - 78 * MIN, expiresAt: Date.now() + 3.5 * 60 * MIN, isNew: false,
  },
  {
    id: 's16', symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',
    sector: 'Banking', action: 'SELL', strength: 'Strong', confidence: 72,
    riskLevel: 'High', entry: 6823.9, target: 6200, stopLoss: 7050,
    riskReward: rr(6823.9, 6200, 7050),
    reason: 'NBFC sector headwinds with rising credit costs. High valuation premium at 8× P/B. AUM growth below guidance for 2 quarters.',
    indicators: [
      ind('RSI', 'bearish', '71.3 – Overbought'),
      ind('MACD', 'bearish', 'Strong bearish signal'),
      ind('EMA Cross', 'bearish', 'Death cross forming'),
      ind('Volume', 'bearish', 'High sell volume'),
      ind('Bollinger', 'bearish', 'Upper band rejection'),
    ],
    generatedAt: Date.now() - 15 * MIN, expiresAt: Date.now() + 6 * 60 * MIN, isNew: true,
  },
  {
    id: 's17', symbol: 'ASIANPAINT', name: 'Asian Paints Ltd',
    sector: 'FMCG', action: 'SELL', strength: 'Weak', confidence: 55,
    riskLevel: 'High', entry: 2845.3, target: 2620, stopLoss: 2940,
    riskReward: rr(2845.3, 2620, 2940),
    reason: 'New competition from Birla Opus entering premium segment. Volume growth under pressure. Double top pattern on weekly chart.',
    indicators: [
      ind('RSI', 'bearish', '64.2 – Bearish divergence'),
      ind('MACD', 'neutral', 'Slightly bearish'),
      ind('EMA Cross', 'neutral', 'Consolidating'),
      ind('Volume', 'bearish', 'Low follow-through'),
      ind('Bollinger', 'bearish', 'Narrowing – watch'),
    ],
    generatedAt: Date.now() - 200 * MIN, expiresAt: Date.now() + 1 * 60 * MIN, isNew: false,
  },

  /* ── HOLD Signals ─────────────────────────────────────────────────── */
  {
    id: 's18', symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd',
    sector: 'Telecom', action: 'HOLD', strength: 'Moderate', confidence: 52,
    riskLevel: 'Low', entry: 1543.2, target: 1620, stopLoss: 1490,
    riskReward: rr(1543.2, 1620, 1490),
    reason: 'Range-bound awaiting tariff hike catalysts. ARPU expansion supportive but priced in. Await breakout above 1,580 for fresh entry.',
    indicators: [
      ind('RSI', 'neutral', '51.8 – Neutral'),
      ind('MACD', 'neutral', 'Flat histogram'),
      ind('EMA Cross', 'neutral', 'EMAs converging'),
      ind('Volume', 'neutral', '0.95× avg'),
      ind('ADX', 'neutral', 'ADX: 15 – No trend'),
    ],
    generatedAt: Date.now() - 98 * MIN, expiresAt: Date.now() + 2 * 60 * MIN, isNew: false,
  },
  {
    id: 's19', symbol: 'SBIN', name: 'State Bank of India',
    sector: 'Banking', action: 'HOLD', strength: 'Weak', confidence: 48,
    riskLevel: 'Medium', entry: 824.3, target: 865, stopLoss: 795,
    riskReward: rr(824.3, 865, 795),
    reason: 'Awaiting PCR improvement and clarity on stressed assets. Attractive P/B of 1.2× but lacks near-term catalyst. Watch 840 level.',
    indicators: [
      ind('RSI', 'neutral', '50.2 – Neutral'),
      ind('MACD', 'neutral', 'Zero-line oscillating'),
      ind('EMA Cross', 'bearish', 'Below 50 EMA – weak'),
      ind('Volume', 'neutral', '1.0× avg'),
      ind('Stochastic', 'neutral', 'Mid-range: 45'),
    ],
    generatedAt: Date.now() - 160 * MIN, expiresAt: Date.now() + 1 * 60 * MIN, isNew: false,
  },
  {
    id: 's20', symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',
    sector: 'Auto', action: 'HOLD', strength: 'Weak', confidence: 50,
    riskLevel: 'High', entry: 943.8, target: 985, stopLoss: 910,
    riskReward: rr(943.8, 985, 910),
    reason: 'JLR EV transition uncertainty. Domestic PV slowdown noted in recent monthly sales data. Hold with strict SL at 910.',
    indicators: [
      ind('RSI', 'neutral', '48.1 – Mildly bearish'),
      ind('MACD', 'bearish', 'Bearish histogram'),
      ind('EMA Cross', 'neutral', 'Testing 200 EMA'),
      ind('Volume', 'neutral', '1.1× avg'),
      ind('ADX', 'neutral', 'ADX: 17 – Weak'),
    ],
    generatedAt: Date.now() - 185 * MIN, expiresAt: Date.now() + 0.5 * 60 * MIN, isNew: false,
  },
];

export const DEFAULT_SIGNAL_FILTERS: SignalFilterState = {
  search: '',
  action: 'ALL',
  risk: 'ALL',
  strength: 'ALL',
  sector: 'ALL',
  sortBy: 'latest',
};

export function filterSignals(
  signals: DetailedSignal[],
  f: SignalFilterState,
): DetailedSignal[] {
  let result = [...signals];

  if (f.search) {
    const q = f.search.toLowerCase();
    result = result.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }
  if (f.action !== 'ALL') result = result.filter((s) => s.action === f.action);
  if (f.risk !== 'ALL') result = result.filter((s) => s.riskLevel === f.risk);
  if (f.strength !== 'ALL') result = result.filter((s) => s.strength === f.strength);
  if (f.sector !== 'ALL') result = result.filter((s) => s.sector === f.sector);

  result.sort((a, b) => {
    if (f.sortBy === 'confidence') return b.confidence - a.confidence;
    if (f.sortBy === 'riskReward') return b.riskReward - a.riskReward;
    return b.generatedAt - a.generatedAt; // latest
  });

  return result;
}
