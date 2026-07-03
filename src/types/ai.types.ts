export type SignalAction = 'BUY' | 'SELL' | 'HOLD';
export type SignalStrength = 'Strong' | 'Moderate' | 'Weak';

export interface AISignal {
  id: string;
  symbol: string;
  name: string;
  action: SignalAction;
  confidence: number;
  strength: SignalStrength;
  reason: string;
  generatedAt: number;
}

export interface ConfidenceFactor {
  label: string;
  score: number;
}

export interface AIConfidence {
  score: number;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  summary: string;
  factors: ConfidenceFactor[];
  updatedAt: number;
}
