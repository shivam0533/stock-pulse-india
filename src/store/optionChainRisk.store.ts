import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Risk configuration for trades opened from the NIFTY Option Chain page only.
 * Fully separate from the Algo Trading module's risk settings/store — must
 * never be imported by or merged with anything under src/components/algo or
 * src/store/algo*.
 */
export interface OptionChainRiskSettings {
  maxLossPercent: number;
  maxProfitPercent: number;
  applyAutomatically: boolean;
  paperTradingOnly: boolean;
  /** Hard cap on total orders (manual Buy clicks + Auto Trading entries) placed today. 0 = no limit. */
  maxOrdersPerDay: number;
  /** Hard cap on quantity (lotSize × lots) for any single order. 0 = no limit. */
  maxQuantityPerTrade: number;
  /** Hard cap on the computed ₹ max-loss for any single order (investment × Max Loss %). 0 = no limit. */
  maxLossPerTrade: number;
  /** Auto-disables Buy for the rest of the day once this many consecutive losing trades have closed today. 0 = disabled. */
  maxConsecutiveLosses: number;
}

export const DEFAULT_OPTION_CHAIN_RISK_SETTINGS: OptionChainRiskSettings = {
  maxLossPercent: 3,
  maxProfitPercent: 7,
  applyAutomatically: true,
  paperTradingOnly: true,
  maxOrdersPerDay: 0,
  maxQuantityPerTrade: 0,
  maxLossPerTrade: 0,
  maxConsecutiveLosses: 0,
};

interface OptionChainRiskState extends OptionChainRiskSettings {
  applySettings: (settings: Partial<OptionChainRiskSettings>) => void;
  resetToDefault: () => void;
}

export const useOptionChainRiskStore = create<OptionChainRiskState>()(
  persist(
    (set) => ({
      ...DEFAULT_OPTION_CHAIN_RISK_SETTINGS,
      applySettings: (settings) => set(settings),
      resetToDefault: () => set(DEFAULT_OPTION_CHAIN_RISK_SETTINGS),
    }),
    { name: 'option-chain-risk-store' },
  ),
);
