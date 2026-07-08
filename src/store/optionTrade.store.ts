import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { placeOptionOrder, getActiveBrokerAdapter } from '@services/broker/brokerExecution.service';
import { paperBrokerAdapter } from '@services/broker/paperBrokerAdapter';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useOptionChainToastStore } from '@store/optionChainToast.store';
import { getLotSize } from '@config/lotSize.config';
import { isDevTestingModeEnabled } from '@config/devTestingMode';
import type {
  ActiveOptionTrade,
  CompletedOptionTrade,
  OptionExitKind,
  OptionSide,
  OptionOrderType,
  OptionProductType,
} from '@/types';

interface OpenTradeParams {
  strike: number;
  side: OptionSide;
  expiry: string;
  /** Angel One instrument-master expiry key (e.g. "07JUL2026") — present only for a live chain; forwarded to the broker adapter so a real order can resolve its symbolToken automatically. */
  expiryRaw?: string;
  entryPrice: number;
  lots: number;
  /** Defaults to MARKET — every existing caller (Auto Trading) keeps its current behavior unchanged. */
  orderType?: OptionOrderType;
  /** Defaults to INTRADAY — every existing caller (Auto Trading, and manual trades before this feature) keeps auto square-off at 3:20 PM unchanged. */
  productType?: OptionProductType;
  /** Required for LIMIT orders (the limit price) — separate from entryPrice, which is always the live premium shown at click time and is what a MARKET order fills at. */
  limitPrice?: number;
  /** Required for SL / SL-M orders. */
  triggerPrice?: number;
}

interface OptionTradeState {
  activeTrade: ActiveOptionTrade | null;
  history: CompletedOptionTrade[];
  /** Set when openTrade is rejected — validation failure or broker not authenticated. */
  tradeError: string | null;
  /** Baseline timestamp for the Overall Trading Summary — trades with exitTime at or before this are excluded from the summary (but never removed from Trade History). Null = include everything. */
  statsResetAt: number | null;
  /** Opens a new trade via the active broker adapter, applying the current Option Chain Risk Settings. A real (non-paper) broker call is a genuine network request, so this is async. Returns false if rejected. */
  openTrade: (params: OpenTradeParams) => Promise<boolean>;
  /** Called every tick with the latest simulated LTP. Handles auto-exit on SL/Target. */
  updateLTP: (ltp: number) => void;
  /** Exit by the user (default) or, when called with 'AI_REVERSAL' by the Auto Trading engine's optional AI Reversal Exit check, an early exit triggered because the AI signal flipped against the open position. */
  exitTrade: (trigger?: 'AI_REVERSAL') => void;
  /** Force-closes the open trade at intraday market close (3:20 PM IST). No-op if nothing is OPEN. */
  autoSquareOff: () => void;
  /** Optional trailing-stop ratchet (Auto Trading Engine only) — raises stopLoss but never lowers it, and never touches the initial 3% calculation or the SL/Target exit checks in updateLTP. No-op if nothing is OPEN or newStopLoss isn't higher than the current one. */
  raiseStopLoss: (newStopLoss: number) => void;
  /** Dismiss the completed trade panel so the user can start fresh. */
  dismissTrade: () => void;
  clearHistory: () => void;
  /** Resets the Overall Trading Summary stats only — Trade History is left untouched. */
  resetStats: () => void;
}

function formatPct(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function isValidLots(lots: number): boolean {
  return Number.isInteger(lots) && lots >= 1;
}

// IST is a fixed UTC+5:30 offset (no DST) — never combine with
// date.getTimezoneOffset() (see marketHours.ts / useOptionTradeMonitor.ts,
// which document this same fix already made twice elsewhere this session).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istDateKey(epochMs: number): string {
  const ist = new Date(epochMs + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
}

/** Total orders (manual + Auto Trading) placed today — completed trades opened today, plus the current OPEN trade if it was also opened today. */
function ordersPlacedToday(history: CompletedOptionTrade[], activeTrade: ActiveOptionTrade | null): number {
  const todayKey = istDateKey(Date.now());
  const historyToday = history.filter((h) => istDateKey(h.entryTime) === todayKey).length;
  const activeToday = activeTrade && istDateKey(activeTrade.entryTime) === todayKey ? 1 : 0;
  return historyToday + activeToday;
}

/** Length of today's current losing streak — walks history (newest-first) until a win or a trade from a prior day is hit. */
function consecutiveLossesToday(history: CompletedOptionTrade[]): number {
  const todayKey = istDateKey(Date.now());
  let count = 0;
  for (const h of history) {
    if (istDateKey(h.exitTime) !== todayKey || h.pnlAmount >= 0) break;
    count += 1;
  }
  return count;
}

function tradeLabel(trade: Pick<ActiveOptionTrade, 'strike' | 'side'>): string {
  return `NIFTY ${trade.strike} ${trade.side}`;
}

// TEMP DIAGNOSTIC — gated by Developer Testing Mode only, remove once the
// Active Trade lifecycle issue is confirmed fixed. Logs every OPEN -> other
// status transition with the file/function and the exact values involved.
function logTransition(fn: string, detail: Record<string, unknown>): void {
  if (!isDevTestingModeEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[TradeLifecycle] optionTrade.store.ts:${fn}`, detail);
}

function makeCompleted(
  trade: ActiveOptionTrade,
  exitPrice: number,
  exitKind: OptionExitKind,
  exitTime: number,
  exitTrigger?: 'AI_REVERSAL',
): CompletedOptionTrade {
  const exitReason =
    exitKind === 'STOP_LOSS'       ? `Stop Loss Hit (-${formatPct(trade.lossPercent)}%)`
    : exitKind === 'TARGET'        ? `Target Hit (+${formatPct(trade.profitPercent)}%)`
    : exitKind === 'AUTO_SQUARE_OFF' ? 'Market Auto Square Off (3:20 PM)'
    : exitTrigger === 'AI_REVERSAL' ? 'AI Reversal Exit'
    : 'Manual Exit';

  const pnlPerUnit = exitPrice - trade.entryPrice;

  return {
    id: trade.id,
    strike: trade.strike,
    side: trade.side,
    expiry: trade.expiry,
    entryPrice: trade.entryPrice,
    exitPrice: +exitPrice.toFixed(2),
    orderType: trade.orderType,
    productType: trade.productType,
    lotSize: trade.lotSize,
    lots: trade.lots,
    quantity: trade.quantity,
    investment: trade.investment,
    pnlAmount: +(pnlPerUnit * trade.quantity).toFixed(2),
    pnlPercent: +((pnlPerUnit / trade.entryPrice) * 100).toFixed(2),
    exitReason,
    exitKind,
    entryTime: trade.entryTime,
    exitTime,
    stopLoss: trade.stopLoss,
    target: trade.target,
    strategyName: 'Manual (Option Chain)',
    exitTrigger,
  };
}

export const useOptionTradeStore = create<OptionTradeState>()(
  persist(
    (set, get) => ({
      activeTrade: null,
      history: [],
      tradeError: null,
      statsResetAt: null,

      openTrade: async (params) => {
        if (get().activeTrade?.status === 'OPEN') {
          set({ tradeError: 'You already have an active open trade. Exit it before opening a new position.' });
          return false;
        }

        if (!isValidLots(params.lots)) {
          set({ tradeError: 'Select at least 1 lot to place an order.' });
          return false;
        }

        if (!Number.isFinite(params.entryPrice) || params.entryPrice <= 0) {
          set({ tradeError: 'Invalid premium — cannot place this order.' });
          return false;
        }

        const orderType: OptionOrderType = params.orderType ?? 'MARKET';
        const productType: OptionProductType = params.productType ?? 'INTRADAY';

        if (orderType === 'LIMIT' && !(params.limitPrice && params.limitPrice > 0)) {
          set({ tradeError: 'Enter a valid limit price for a LIMIT order.' });
          return false;
        }
        if ((orderType === 'SL' || orderType === 'SL-M') && !(params.triggerPrice && params.triggerPrice > 0)) {
          set({ tradeError: `Enter a valid trigger price for a ${orderType} order.` });
          return false;
        }

        const risk = useOptionChainRiskStore.getState();
        // Paper Trading uses the configured paper lot size; once a real
        // broker is authenticated and actually executing the order, fall
        // back to the official NSE lot size automatically. Computed before
        // the broker call (not after) since a real order must state its
        // quantity upfront — unlike the paper fill, which only needed a price.
        const usedAdapterId = risk.paperTradingOnly ? 'PAPER' : getActiveBrokerAdapter().id;
        const lotSize  = getLotSize('NIFTY', usedAdapterId === 'PAPER');
        const quantity = lotSize * params.lots;

        // ── Global Risk Management — applies to every order, manual or Auto
        // Trading, since both flows call this same openTrade(). Each limit is
        // opt-in (0 = no limit) so existing behavior is unchanged until the
        // user configures one in Risk Settings.
        if (risk.maxQuantityPerTrade > 0 && quantity > risk.maxQuantityPerTrade) {
          set({ tradeError: `Quantity ${quantity} exceeds the configured Max Quantity Per Trade (${risk.maxQuantityPerTrade}).` });
          return false;
        }
        const estimatedEntryPrice = orderType === 'LIMIT' ? params.limitPrice! : params.entryPrice;
        const estimatedMaxLoss = +((estimatedEntryPrice * quantity) * risk.maxLossPercent / 100).toFixed(2);
        if (risk.maxLossPerTrade > 0 && estimatedMaxLoss > risk.maxLossPerTrade) {
          set({ tradeError: `Potential loss ₹${estimatedMaxLoss} exceeds the configured Max Loss Per Trade (₹${risk.maxLossPerTrade}).` });
          return false;
        }
        if (risk.maxOrdersPerDay > 0 && ordersPlacedToday(get().history, get().activeTrade) >= risk.maxOrdersPerDay) {
          set({ tradeError: `Daily order limit reached (${risk.maxOrdersPerDay}). No more trades allowed today.` });
          return false;
        }
        if (risk.maxConsecutiveLosses > 0 && consecutiveLossesToday(get().history) >= risk.maxConsecutiveLosses) {
          set({ tradeError: `Trading paused for today — ${risk.maxConsecutiveLosses} consecutive losing trades hit the configured limit.` });
          return false;
        }

        const orderReq = {
          strike: params.strike,
          side: params.side,
          expiry: params.expiry,
          expiryRaw: params.expiryRaw,
          price: orderType === 'LIMIT' ? params.limitPrice! : params.entryPrice,
          quantity,
          orderType,
          productType,
          triggerPrice: params.triggerPrice,
        };

        let filledPrice: number;
        let id: string;
        try {
          // "Paper Trading Only" forces the paper adapter regardless of the
          // app-wide active broker, so Option Chain trades never route to a
          // live broker unless this toggle is explicitly turned off.
          const result = risk.paperTradingOnly
            ? await paperBrokerAdapter.placeOrder(orderReq)
            : await placeOptionOrder(orderReq);
          filledPrice = result.filledPrice;
          id = result.brokerOrderId;
        } catch (err) {
          const message = (err as Error).message;
          set({ tradeError: message });
          useOptionChainToastStore.getState().push('rejected', `Order Rejected — ${message}`);
          return false;
        }

        // Re-check — an await above means another call could have opened a
        // trade in the meantime (e.g. a near-simultaneous manual + auto-trade click).
        if (get().activeTrade?.status === 'OPEN') {
          set({ tradeError: 'You already have an active open trade. Exit it before opening a new position.' });
          return false;
        }

        const lossPercent   = risk.maxLossPercent;
        const profitPercent = risk.maxProfitPercent;
        const investment = +(filledPrice * quantity).toFixed(2);

        const trade: ActiveOptionTrade = {
          id,
          strike: params.strike,
          side: params.side,
          expiry: params.expiry,
          expiryRaw: params.expiryRaw,
          entryPrice: filledPrice,
          currentLTP: filledPrice,
          stopLoss: +(filledPrice * (1 - lossPercent / 100)).toFixed(2),
          target:    +(filledPrice * (1 + profitPercent / 100)).toFixed(2),
          lossPercent,
          profitPercent,
          autoExitEnabled: risk.applyAutomatically,
          orderType,
          productType,
          triggerPrice: params.triggerPrice,
          lotSize,
          lots: params.lots,
          quantity,
          investment,
          maxLossAmount: +(investment * lossPercent / 100).toFixed(2),
          maxProfitAmount: +(investment * profitPercent / 100).toFixed(2),
          status: 'OPEN',
          entryTime: Date.now(),
          exitTime: null,
        };

        set({ tradeError: null, activeTrade: trade });
        useOptionChainToastStore.getState().push('opened', `Trade Opened — ${tradeLabel(trade)} × ${quantity} (Order ID: ${trade.id})`);
        logTransition('openTrade', {
          id: trade.id, strike: trade.strike, side: trade.side,
          entryPrice: trade.entryPrice, stopLoss: trade.stopLoss, target: trade.target,
          autoExitEnabled: trade.autoExitEnabled, status: trade.status,
        });
        return true;
      },

      updateLTP: (ltp) =>
        set((state) => {
          const trade = state.activeTrade;
          if (!trade || trade.status !== 'OPEN') return state;

          if (trade.autoExitEnabled) {
            // SL triggered
            if (ltp <= trade.stopLoss) {
              const exitTime = Date.now();
              useOptionChainToastStore.getState().push('stop-loss', `🔴 Stop Loss Hit — ${tradeLabel(trade)}`);
              logTransition('updateLTP (SL branch, ~line 207)', {
                id: trade.id, incomingLtp: ltp, stopLoss: trade.stopLoss, entryPrice: trade.entryPrice,
                reason: 'ltp <= trade.stopLoss', newStatus: 'SL_HIT',
              });
              return {
                activeTrade: { ...trade, currentLTP: trade.stopLoss, status: 'SL_HIT', exitTime },
                history: [makeCompleted(trade, trade.stopLoss, 'STOP_LOSS', exitTime), ...state.history],
              };
            }

            // Target triggered
            if (ltp >= trade.target) {
              const exitTime = Date.now();
              useOptionChainToastStore.getState().push('target', `🟢 Target Hit — ${tradeLabel(trade)}`);
              logTransition('updateLTP (target branch, ~line 219)', {
                id: trade.id, incomingLtp: ltp, target: trade.target, entryPrice: trade.entryPrice,
                reason: 'ltp >= trade.target', newStatus: 'TARGET_HIT',
              });
              return {
                activeTrade: { ...trade, currentLTP: trade.target, status: 'TARGET_HIT', exitTime },
                history: [makeCompleted(trade, trade.target, 'TARGET', exitTime), ...state.history],
              };
            }
          }

          return { activeTrade: { ...trade, currentLTP: +ltp.toFixed(2) } };
        }),

      exitTrade: (trigger) =>
        set((state) => {
          const trade = state.activeTrade;
          if (!trade || trade.status !== 'OPEN') return state;
          const exitPrice = trade.currentLTP;
          const exitTime = Date.now();
          const label = trigger === 'AI_REVERSAL' ? 'AI Reversal Exit' : 'Trade Closed';
          useOptionChainToastStore.getState().push('closed', `${label} — ${tradeLabel(trade)}`);
          logTransition('exitTrade (~line 231)', {
            id: trade.id, trigger: trigger ?? 'manual (Exit button)', exitPrice, newStatus: 'MANUAL_EXIT',
          });
          return {
            activeTrade: { ...trade, status: 'MANUAL_EXIT', exitTime, exitTrigger: trigger },
            history: [makeCompleted(trade, exitPrice, 'MANUAL', exitTime, trigger), ...state.history],
          };
        }),

      autoSquareOff: () =>
        set((state) => {
          const trade = state.activeTrade;
          if (!trade || trade.status !== 'OPEN') return state;
          // CARRYFORWARD (NRML) trades are intentionally held overnight — the
          // 3:20 PM intraday square-off must never touch them.
          if (trade.productType === 'CARRYFORWARD') return state;
          const exitTime = Date.now();
          useOptionChainToastStore.getState().push('square-off', `Market Auto Square Off — ${tradeLabel(trade)} closed`);
          logTransition('autoSquareOff (~line 245)', {
            id: trade.id, currentLTP: trade.currentLTP, newStatus: 'AUTO_SQUARE_OFF',
            note: 'Called from useOptionTradeMonitor.ts tick — should NOT fire while Dev Testing Mode is on',
          });
          return {
            activeTrade: { ...trade, status: 'AUTO_SQUARE_OFF', exitTime },
            history: [makeCompleted(trade, trade.currentLTP, 'AUTO_SQUARE_OFF', exitTime), ...state.history],
          };
        }),

      raiseStopLoss: (newStopLoss) =>
        set((state) => {
          const trade = state.activeTrade;
          if (!trade || trade.status !== 'OPEN') return state;
          if (!Number.isFinite(newStopLoss) || newStopLoss <= trade.stopLoss) return state;
          return { activeTrade: { ...trade, stopLoss: +newStopLoss.toFixed(2) } };
        }),

      dismissTrade: () => set({ activeTrade: null }),

      clearHistory: () => set({ history: [] }),

      resetStats: () => set({ statsResetAt: Date.now() }),
    }),
    {
      name: 'option-trade-store',
      version: 5,
      // Pre-v4 trades predate stopLoss/target/strategyName on history
      // entries (needed by the standalone Trade History page). v5 adds
      // orderType/productType (needed by autoSquareOff's CARRYFORWARD
      // exemption). Validate shape directly (not just the version number)
      // so any stale/partial persisted data from an older build is
      // discarded instead of being merged in and breaking the panel with
      // undefined fields.
      migrate: (persisted) => {
        const p = persisted as Partial<OptionTradeState> | undefined;
        const trade = p?.activeTrade as Partial<ActiveOptionTrade> | null | undefined;

        const tradeIsValid =
          trade == null ||
          (typeof trade.lossPercent === 'number' &&
            typeof trade.profitPercent === 'number' &&
            typeof trade.autoExitEnabled === 'boolean' &&
            typeof trade.quantity === 'number' &&
            typeof trade.investment === 'number' &&
            typeof trade.orderType === 'string' &&
            typeof trade.productType === 'string' &&
            'exitTime' in trade);

        const historyIsValid =
          Array.isArray(p?.history) &&
          p.history.every((h) => {
            const c = h as Partial<CompletedOptionTrade>;
            return typeof c?.pnlAmount === 'number' &&
              typeof c?.exitKind === 'string' &&
              typeof c?.quantity === 'number' &&
              typeof c?.stopLoss === 'number' &&
              typeof c?.target === 'number' &&
              typeof c?.strategyName === 'string' &&
              typeof c?.orderType === 'string' &&
              typeof c?.productType === 'string';
          });

        if (!tradeIsValid || !historyIsValid) {
          return { activeTrade: null, history: [], tradeError: null };
        }
        return p as OptionTradeState;
      },
    },
  ),
);
