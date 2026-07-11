/**
 * Fixed Min/Max LTP range for the AI Trade Selection Logic — scoped to the
 * Option Chain AI Decision Engine only. The engine ignores every contract
 * whose LTP falls outside [minLTP, maxLTP] when picking the best
 * strike/side/action. Fully separate from Option Chain Risk Settings.
 * Intentionally not user-editable — a fixed constant, not a store.
 */
export interface AITradeSelectionSettings {
  minLTP: number;
  maxLTP: number;
}

export const AI_TRADE_SELECTION_SETTINGS: AITradeSelectionSettings = {
  minLTP: 30,
  maxLTP: 120,
};
