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
}

export const DEFAULT_OPTION_CHAIN_RISK_SETTINGS: OptionChainRiskSettings = {
  maxLossPercent: 3,
  maxProfitPercent: 7,
  applyAutomatically: true,
  paperTradingOnly: true,
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
