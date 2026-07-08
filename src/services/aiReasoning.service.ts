import type { AIIndicatorSnapshot, AIMomentum, AISignal, AITrend } from '@/types';

/**
 * Pure, read-only "explain the AI's pick" layer for the Option Chain module.
 * Consumes an already-generated AISignal (from aiDecisionEngine.service.ts)
 * and derives a human-readable list of reasoning factors plus a few extra
 * display metrics (Market Strength, Probability). Does not compute or alter
 * confidence/recommendation/trend/momentum — those remain owned entirely by
 * the existing AI Decision Engine. This module only explains WHY, never
 * decides WHAT — trade selection, execution, Stop Loss and Target stay with
 * the existing engine and optionTrade.store.
 */

export interface AIReasoningSummary {
  factors: string[];
  confidence: number;
  marketStrength: 'Strong' | 'Moderate' | 'Weak';
  marketStrengthScore: number;
  momentum: AIMomentum;
  probability: number;
  signalTime: number;
}

function buildFactors(ind: AIIndicatorSnapshot, trend: AITrend): string[] {
  const factors: string[] = [];

  factors.push(ind.pcr < 0.9 ? 'PCR Bullish' : ind.pcr > 1.1 ? 'PCR Bearish' : 'PCR Neutral');
  factors.push(ind.changeInOI > 0 ? 'OI Increasing' : 'OI Decreasing');
  if (ind.volumeSpike) factors.push('Strong Volume');
  if (ind.rsi >= 60) factors.push('RSI Breakout');
  else if (ind.rsi <= 40) factors.push('RSI Breakdown');
  factors.push(ind.ema >= ind.vwap ? 'EMA Crossover (Bullish)' : 'EMA Crossover (Bearish)');
  factors.push(
    ind.priceAction === 'Breakout' ? 'VWAP Support'
    : ind.priceAction === 'Breakdown' ? 'VWAP Resistance'
    : 'VWAP Consolidation',
  );
  factors.push(Math.abs(ind.atmMovement) > 80 ? 'Max Pain Shift' : 'Max Pain Aligned');
  factors.push(trend === 'Sideways' ? 'Trend Unconfirmed' : `${trend} Trend Confirmation`);

  return factors;
}

export function buildReasoningSummary(signal: AISignal): AIReasoningSummary {
  const ind = signal.indicators;
  const marketStrengthScore = ind.trendStrength;
  const marketStrength: AIReasoningSummary['marketStrength'] =
    marketStrengthScore >= 65 ? 'Strong' : marketStrengthScore >= 40 ? 'Moderate' : 'Weak';
  const probability = Math.max(0, Math.min(100, Math.round(signal.confidence * 0.7 + marketStrengthScore * 0.3)));

  return {
    factors: buildFactors(ind, signal.trend),
    confidence: signal.confidence,
    marketStrength,
    marketStrengthScore,
    momentum: signal.momentum,
    probability,
    signalTime: signal.generatedAt,
  };
}
