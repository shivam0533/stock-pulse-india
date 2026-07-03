import type { SignalAction, SignalStrength } from './dashboard.types';
import type { Sector } from './stock.types';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type IndicatorStatus = 'bullish' | 'bearish' | 'neutral';

export interface SignalIndicator {
  name: string;
  status: IndicatorStatus;
  value: string;
}

export interface DetailedSignal {
  id: string;
  symbol: string;
  name: string;
  sector: Sector;
  action: SignalAction;
  strength: SignalStrength;
  confidence: number;    // 0–100
  riskLevel: RiskLevel;
  entry: number;
  target: number;
  stopLoss: number;
  riskReward: number;
  reason: string;
  indicators: SignalIndicator[];
  generatedAt: number;
  expiresAt: number;
  isNew: boolean;        // generated in last 30 min
}

export interface SignalFilterState {
  search: string;
  action: SignalAction | 'ALL';
  risk: RiskLevel | 'ALL';
  strength: SignalStrength | 'ALL';
  sector: Sector | 'ALL';
  sortBy: 'latest' | 'confidence' | 'riskReward';
}
