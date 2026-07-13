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

const STORAGE_KEY = 'option-chain-risk-store';

// Captured once, synchronously, at module load — BEFORE zustand's persist
// middleware hydrates the in-memory store below. This is the only reliable
// way to distinguish "a genuinely brand-new browser" (localStorage key never
// existed) from "an existing user whose persisted state merges in a `true`/
// `false` flag either way once this field exists" — a plain persisted
// boolean can't make that distinction on its own once older browsers (with
// no such flag yet) start rehydrating and merging in a fresh `false` for the
// missing key. Only a genuinely fresh browser gets the Admin Panel's Risk
// Defaults applied automatically; any browser with prior state (even at the
// app's own hardcoded 3%/7%) keeps exactly what it already had.
const isFreshBrowser = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === null;
let serverDefaultsApplied = false;

interface OptionChainRiskState extends OptionChainRiskSettings {
  applySettings: (settings: Partial<OptionChainRiskSettings>) => void;
  resetToDefault: () => void;
  /** Phase 2 — called once on app load with the Admin Panel's configured Risk Defaults; only ever applies on a genuinely fresh browser, and only once per page load. */
  applyServerDefaultsOnce: (defaults: { maxLossPercent: number; maxProfitPercent: number }) => void;
}

export const useOptionChainRiskStore = create<OptionChainRiskState>()(
  persist(
    (set) => ({
      ...DEFAULT_OPTION_CHAIN_RISK_SETTINGS,
      applySettings: (settings) => set(settings),
      resetToDefault: () => set(DEFAULT_OPTION_CHAIN_RISK_SETTINGS),
      applyServerDefaultsOnce: (defaults) => {
        if (!isFreshBrowser || serverDefaultsApplied) return;
        serverDefaultsApplied = true;
        set(defaults);
      },
    }),
    { name: STORAGE_KEY },
  ),
);
