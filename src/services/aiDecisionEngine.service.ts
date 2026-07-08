import type { OptionStrike } from '@/types';
import type {
  AIAction,
  AIActionScore,
  AIIndicatorSnapshot,
  AIMomentum,
  AIRecommendation,
  AISignal,
  AITradeSelectionCandidate,
  AITradeSelectionResult,
  AITrend,
} from '@/types';

/**
 * Pure, mock-data-only scoring model for the Option Chain AI Decision Engine.
 * No network calls, no real technical-analysis library — every indicator
 * that isn't already in the option chain data (Greeks, VWAP, EMA, RSI, MACD,
 * SuperTrend, Support/Resistance, OI Build-up, Trend Strength, Momentum) is
 * synthesized here from the real OI/volume/IV numbers plus bounded
 * randomness, so the signal still reacts to genuine option-chain movement
 * instead of being pure noise. Illustrative only — not investment advice,
 * and never wired to order placement.
 */

const CONFIDENCE_THRESHOLD = 80;

export interface AIDecisionInput {
  strike: number;
  expiry: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  row: OptionStrike;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function buildIndicators(input: AIDecisionInput): AIIndicatorSnapshot {
  const { row, spotPrice, pcr, maxPain, strike } = input;

  const netOI = row.callOI - row.putOI;
  const netChgOI = row.callChgOI - row.putChgOI;
  const volume = row.callVolume + row.putVolume;
  const volumeBaseline = (row.callOI + row.putOI) * 0.25;
  const volumeSpike = volume > volumeBaseline * 1.3;

  const rsi = clamp(50 + netChgOI / 4000 + rand(-8, 8), 5, 95);
  const macd = clamp(netChgOI / 20_000 + rand(-0.3, 0.3), -2, 2);
  const trendStrength = clamp(50 + Math.abs(netOI) / 3000 + rand(-10, 10), 0, 100);
  const momentumScore = clamp(netChgOI / 500 + rand(-15, 15), -100, 100);
  const superTrendBullish = momentumScore > 0;
  const vwap = spotPrice * (1 + rand(-0.0015, 0.0015));
  const ema = spotPrice * (1 + rand(-0.001, 0.001));

  const priceAction: AIIndicatorSnapshot['priceAction'] =
    spotPrice > vwap * 1.001 ? 'Breakout'
    : spotPrice < vwap * 0.999 ? 'Breakdown'
    : 'Consolidation';

  const oiBuildup: AIIndicatorSnapshot['oiBuildup'] =
    netChgOI > 3000 && netOI > 0 ? 'Long Buildup'
    : netChgOI < -3000 && netOI < 0 ? 'Short Buildup'
    : netChgOI < -3000 && netOI > 0 ? 'Long Unwinding'
    : netChgOI > 3000 && netOI < 0 ? 'Short Unwinding'
    : 'Neutral';

  return {
    oi: row.callOI + row.putOI,
    changeInOI: netChgOI,
    volume,
    volumeSpike,
    pcr,
    iv: +((row.callIV + row.putIV) / 2).toFixed(2),
    delta: clamp(0.5 + netOI / 200_000, 0.05, 0.95),
    gamma: clamp(0.02 + rand(-0.005, 0.005), 0.001, 0.05),
    theta: -clamp(rand(0.5, 3), 0.1, 5),
    vega: clamp(rand(4, 14), 1, 20),
    vwap: +vwap.toFixed(2),
    ema: +ema.toFixed(2),
    rsi: +rsi.toFixed(1),
    macd: +macd.toFixed(2),
    superTrendBullish,
    priceAction,
    support: maxPain - 100,
    resistance: maxPain + 100,
    maxPain,
    atmMovement: +(spotPrice - strike).toFixed(2),
    oiBuildup,
    trendStrength: +trendStrength.toFixed(0),
    momentumScore: +momentumScore.toFixed(0),
  };
}

function scoreActions(ind: AIIndicatorSnapshot): AIActionScore[] {
  let buyCe = 45, buyPe = 45, sellCe = 40, sellPe = 40;

  // Bullish signals favour BUY CE (and, more weakly, SELL PE as an income play)
  if (ind.superTrendBullish)              { buyCe += 10; sellPe += 5; }
  if (ind.macd > 0)                       { buyCe += 8;  sellPe += 4; }
  if (ind.momentumScore > 20)              buyCe += 10;
  if (ind.oiBuildup === 'Long Buildup')    buyCe += 12;
  if (ind.priceAction === 'Breakout')     { buyCe += 8;  sellPe += 5; }
  if (ind.rsi > 55 && ind.rsi < 70)         buyCe += 6;
  if (ind.pcr < 0.9)                       buyCe += 6;

  // Bearish signals favour BUY PE (and SELL CE as an income play)
  if (!ind.superTrendBullish)             { buyPe += 10; sellCe += 5; }
  if (ind.macd < 0)                       { buyPe += 8;  sellCe += 4; }
  if (ind.momentumScore < -20)              buyPe += 10;
  if (ind.oiBuildup === 'Short Buildup')    buyPe += 12;
  if (ind.priceAction === 'Breakdown')     { buyPe += 8;  sellCe += 5; }
  if (ind.rsi < 45 && ind.rsi > 30)         buyPe += 6;
  if (ind.pcr > 1.1)                        buyPe += 6;

  // Overbought / oversold / range-bound favour selling premium
  if (ind.rsi > 70)                         sellCe += 14;
  if (ind.rsi < 30)                         sellPe += 14;
  if (ind.priceAction === 'Consolidation') { sellCe += 6; sellPe += 6; }
  if (ind.trendStrength < 40)              { sellCe += 6; sellPe += 6; }

  if (ind.volumeSpike) { buyCe += 4; buyPe += 4; }

  return [
    { action: 'BUY_CE',  confidence: clamp(Math.round(buyCe), 5, 97) },
    { action: 'BUY_PE',  confidence: clamp(Math.round(buyPe), 5, 97) },
    { action: 'SELL_CE', confidence: clamp(Math.round(sellCe), 5, 97) },
    { action: 'SELL_PE', confidence: clamp(Math.round(sellPe), 5, 97) },
  ];
}

function buildReason(ind: AIIndicatorSnapshot): string {
  const parts: string[] = [
    `${ind.superTrendBullish ? 'Bullish' : 'Bearish'} SuperTrend`,
    `RSI ${ind.rsi.toFixed(0)}`,
    `MACD ${ind.macd >= 0 ? 'positive' : 'negative'}`,
    `OI shows ${ind.oiBuildup}`,
  ];
  if (ind.volumeSpike) parts.push('volume spike detected');
  parts.push(`price ${ind.priceAction.toLowerCase()} near Max Pain ₹${ind.maxPain.toLocaleString('en-IN')}`);
  return parts.join(' · ');
}

export function generateAISignal(input: AIDecisionInput): AISignal {
  const indicators = buildIndicators(input);
  const scores = scoreActions(indicators);

  const best = scores.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const recommendation: AIRecommendation =
    best.confidence >= CONFIDENCE_THRESHOLD ? best.action : 'WAIT';

  const bestIsCall = best.action === 'BUY_CE' || best.action === 'SELL_CE';
  const currentLTP = bestIsCall ? input.row.callLTP : input.row.putLTP;

  const trend: AITrend =
    indicators.trendStrength < 35 ? 'Sideways'
    : indicators.superTrendBullish ? 'Bullish'
    : 'Bearish';

  const momentum: AIMomentum =
    Math.abs(indicators.momentumScore) > 50 ? 'Strong'
    : Math.abs(indicators.momentumScore) > 20 ? 'Moderate'
    : 'Weak';

  return {
    recommendation,
    confidence: best.confidence,
    strike: input.strike,
    expiry: input.expiry,
    currentLTP,
    trend,
    momentum,
    reason: buildReason(indicators),
    scores,
    indicators,
    generatedAt: Date.now(),
  };
}

export function actionLabel(action: AIAction): string {
  return action.replace('_', ' ');
}

// ── AI Trade Selection Logic ────────────────────────────────────────────────
// Scans every strike's CE and PE contract, ignores anything whose LTP falls
// outside the user-editable [minLTP, maxLTP] range, and auto-selects the
// single highest-confidence Strike + CE/PE + BUY/SELL combination — but only
// as a *decision*, never an order. Reuses generateAISignal()'s existing
// per-strike scoring rather than duplicating it, so both features stay
// consistent with a single source of truth.

const SELECTION_CONFIDENCE_THRESHOLD = 80;

export interface AITradeSelectionChain {
  strikes: OptionStrike[];
  expiry: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
}

export interface AITradeSelectionRange {
  minLTP: number;
  maxLTP: number;
}

export function selectBestTrade(
  chain: AITradeSelectionChain,
  range: AITradeSelectionRange,
): AITradeSelectionResult {
  const { minLTP, maxLTP } = range;
  const candidates: AITradeSelectionCandidate[] = [];

  for (const row of chain.strikes) {
    const signal = generateAISignal({
      strike: row.strike,
      expiry: chain.expiry,
      spotPrice: chain.spotPrice,
      pcr: chain.pcr,
      maxPain: chain.maxPain,
      row,
    });
    const scoreOf = (action: AIAction) => signal.scores.find((s) => s.action === action)!.confidence;

    if (row.callLTP >= minLTP && row.callLTP <= maxLTP) {
      const buy = scoreOf('BUY_CE');
      const sell = scoreOf('SELL_CE');
      const isBuy = buy >= sell;
      candidates.push({
        strike: row.strike, side: 'CE', action: isBuy ? 'BUY' : 'SELL',
        ltp: row.callLTP, confidence: isBuy ? buy : sell,
      });
    }

    if (row.putLTP >= minLTP && row.putLTP <= maxLTP) {
      const buy = scoreOf('BUY_PE');
      const sell = scoreOf('SELL_PE');
      const isBuy = buy >= sell;
      candidates.push({
        strike: row.strike, side: 'PE', action: isBuy ? 'BUY' : 'SELL',
        ltp: row.putLTP, confidence: isBuy ? buy : sell,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      recommendation: 'WAIT',
      best: null,
      contractsAnalyzed: 0,
      reason: `No contracts found with LTP between ₹${minLTP} and ₹${maxLTP} — widen the range to analyze more strikes.`,
      generatedAt: Date.now(),
    };
  }

  const best = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const recommendation: 'SELECT' | 'WAIT' =
    best.confidence >= SELECTION_CONFIDENCE_THRESHOLD ? 'SELECT' : 'WAIT';

  const reason =
    recommendation === 'SELECT'
      ? `Best setup: ${best.action} ${best.side} ${best.strike} at ₹${best.ltp} — ${best.confidence}% confidence across ${candidates.length} contract${candidates.length === 1 ? '' : 's'} in range.`
      : `Highest confidence found is ${best.confidence}%, below the 80% threshold, across ${candidates.length} contract${candidates.length === 1 ? '' : 's'} in range — no trade selected.`;

  return { recommendation, best, contractsAnalyzed: candidates.length, reason, generatedAt: Date.now() };
}
