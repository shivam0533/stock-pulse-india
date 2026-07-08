/** Types for the (mock, display-only) Option Chain AI Decision Engine. */

export type AIAction = 'BUY_CE' | 'BUY_PE' | 'SELL_CE' | 'SELL_PE';
export type AIRecommendation = AIAction | 'WAIT';

export interface AIActionScore {
  action: AIAction;
  confidence: number; // 0-100
}

export type AITrend = 'Bullish' | 'Bearish' | 'Sideways';
export type AIMomentum = 'Strong' | 'Moderate' | 'Weak';
export type AIPriceAction = 'Breakout' | 'Breakdown' | 'Consolidation';
export type AIOIBuildup = 'Long Buildup' | 'Short Buildup' | 'Long Unwinding' | 'Short Unwinding' | 'Neutral';

/** Snapshot of every indicator the engine "analyzed" to reach its confidence scores — mock values only. */
export interface AIIndicatorSnapshot {
  oi: number;
  changeInOI: number;
  volume: number;
  volumeSpike: boolean;
  pcr: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  vwap: number;
  ema: number;
  rsi: number;
  macd: number;
  superTrendBullish: boolean;
  priceAction: AIPriceAction;
  support: number;
  resistance: number;
  maxPain: number;
  atmMovement: number;
  oiBuildup: AIOIBuildup;
  trendStrength: number; // 0-100
  momentumScore: number; // -100..100
}

export interface AISignal {
  recommendation: AIRecommendation;
  confidence: number;
  strike: number;
  expiry: string;
  currentLTP: number;
  trend: AITrend;
  momentum: AIMomentum;
  reason: string;
  /** Confidence for all 4 possible actions, for transparency — the highest one (if ≥80%) becomes the recommendation. */
  scores: AIActionScore[];
  indicators: AIIndicatorSnapshot;
  generatedAt: number;
}

// ── AI Trade Selection Logic (scans every strike, LTP-filtered) ────────────────

export type AISelectionDirection = 'BUY' | 'SELL';

export interface AITradeSelectionCandidate {
  strike: number;
  side: 'CE' | 'PE';
  action: AISelectionDirection;
  ltp: number;
  confidence: number;
}

export interface AITradeSelectionResult {
  /** SELECT only when the best candidate's confidence is ≥80% — otherwise WAIT. Never executed. */
  recommendation: 'SELECT' | 'WAIT';
  best: AITradeSelectionCandidate | null;
  /** How many contracts (CE/PE legs across all strikes) fell inside the Min/Max LTP range. */
  contractsAnalyzed: number;
  reason: string;
  generatedAt: number;
}
