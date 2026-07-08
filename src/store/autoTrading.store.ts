import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auto Trading ON/OFF + every user-configurable guard rail for the Auto
 * Trading Engine (useAutoTradingEngine). Default OFF. Lots, Minimum
 * Confidence, Max Trades/Day, Max Daily Loss, Max Open Positions, Trailing
 * Stop, and AI Reversal Exit are the ONLY execution parameters this store
 * owns — the AI never decides lots/quantity/margin/capital; the user sets
 * these values once, manually. Stop Loss %, Target Profit %, Auto Apply, and
 * Paper Trading Only are NOT duplicated here — Auto Trading calls the
 * existing openTrade(), which already reads those from
 * useOptionChainRiskStore unchanged.
 */
export interface AutoTradingSettings {
  enabled: boolean;
  lots: number;
  /** Auto Trading only executes when the AI's pick is at least this confident (0-100). Independent of, and layered on top of, AI Trade Selection's own 80% threshold. */
  minConfidence: number;
  /** Hard cap on new auto-placed entries per calendar day. */
  maxTradesPerDay: number;
  /** Kill-switch — once today's realized P&L drops to/below -this amount (₹), no new entries are placed for the rest of the day. 0 = no limit. */
  maxDailyLoss: number;
  /** Cap on concurrent open positions. The underlying trade store only ever holds one active trade at a time, so this effectively acts as an on/off gate (0 pauses new entries, 1+ behaves as today). */
  maxOpenPositions: number;
  /** Optional — ratchets the active trade's Stop Loss upward as price moves favourably. Never lowers it, never touches the initial 3% calculation. */
  trailingStopEnabled: boolean;
  /** How far below the peak LTP the trailing stop trails, in percent. */
  trailingStopPercent: number;
  /** Optional — auto-exits (via the existing manual exitTrade()) if the AI's signal flips against the open position. */
  aiReversalExitEnabled: boolean;
  /**
   * One-time safety checkpoint: while Paper Trading Only is OFF (live
   * mode), the engine will not place a single real order until this is
   * explicitly set true by the user in the Auto Trading panel — Paper
   * Trading Only turning off (e.g. automatically, on broker connect) is not
   * by itself enough to let Auto Trading execute real trades.
   */
  liveTradingAcknowledged: boolean;
}

export const DEFAULT_AUTO_TRADING_SETTINGS: AutoTradingSettings = {
  enabled: false,
  lots: 1,
  minConfidence: 80,
  maxTradesPerDay: 5,
  maxDailyLoss: 5000,
  maxOpenPositions: 1,
  trailingStopEnabled: false,
  trailingStopPercent: 2,
  aiReversalExitEnabled: false,
  liveTradingAcknowledged: false,
};

interface AutoTradingState extends AutoTradingSettings {
  setEnabled: (enabled: boolean) => void;
  setLots: (lots: number) => void;
  applySettings: (settings: Partial<AutoTradingSettings>) => void;
  resetToDefault: () => void;
}

export const useAutoTradingStore = create<AutoTradingState>()(
  persist(
    (set) => ({
      ...DEFAULT_AUTO_TRADING_SETTINGS,
      setEnabled: (enabled) => set({ enabled }),
      setLots: (lots) => set({ lots }),
      applySettings: (settings) => set(settings),
      resetToDefault: () => set(DEFAULT_AUTO_TRADING_SETTINGS),
    }),
    { name: 'auto-trading-store' },
  ),
);
