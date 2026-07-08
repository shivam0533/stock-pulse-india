import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Editable Min/Max LTP range for the AI Trade Selection Logic — scoped to
 * the Option Chain AI Decision Engine only. The engine ignores every
 * contract whose LTP falls outside [minLTP, maxLTP] when picking the best
 * strike/side/action. Fully separate from Option Chain Risk Settings.
 */
export interface AITradeSelectionSettings {
  minLTP: number;
  maxLTP: number;
}

export const DEFAULT_AI_TRADE_SELECTION_SETTINGS: AITradeSelectionSettings = {
  minLTP: 20,
  maxLTP: 70,
};

interface AITradeSelectionState extends AITradeSelectionSettings {
  applySettings: (settings: AITradeSelectionSettings) => void;
  resetToDefault: () => void;
}

export const useAITradeSelectionStore = create<AITradeSelectionState>()(
  persist(
    (set) => ({
      ...DEFAULT_AI_TRADE_SELECTION_SETTINGS,
      applySettings: (settings) => set(settings),
      resetToDefault: () => set(DEFAULT_AI_TRADE_SELECTION_SETTINGS),
    }),
    { name: 'ai-trade-selection-store' },
  ),
);
