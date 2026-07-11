import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { placeOptionOrder, exitOptionOrder, getActiveBrokerAdapter } from '@services/broker/brokerExecution.service';
import { paperBrokerAdapter } from '@services/broker/paperBrokerAdapter';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useOptionChainToastStore } from '@store/optionChainToast.store';
import { getPaperLotSize } from '@config/lotSize.config';
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
  /** Real lot size for this contract's expiry, sourced live from the Angel One instrument master (OptionExpiry.lotSize). Required for any real (non-paper) order — Paper Trading ignores this and uses its own configured simulated lot size instead. */
  lotSize?: number;
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

// Re-entrancy guard for performExit — a real broker SELL call can take
// longer than the ~2s live-quote poll interval, and updateLTP fires on
// every poll; without this, a persistent SL breach would fire a duplicate
// exit order on every tick while the first one is still in flight.
let exitInFlight = false;

export const useOptionTradeStore = create<OptionTradeState>()(
  persist(
    (set, get) => {
      /**
       * The one place every exit path (SL hit, Target hit, manual Exit,
       * AI Reversal Exit, 3:20 PM auto square-off) converges. Previously
       * each of those only updated this store's local state — for a real
       * (non-paper) trade that never told Angel One to actually close the
       * position, so the app could show "closed" with a final P&L while the
       * real position stayed open and completely unmonitored on the broker.
       * Paper trades have no real position to close, so they still finalize
       * synchronously exactly as before.
       */
      const initiateExit = (
        trade: ActiveOptionTrade,
        exitPrice: number,
        exitKind: OptionExitKind,
        finalStatus: ActiveOptionTrade['status'],
        exitTrigger?: 'AI_REVERSAL',
      ): void => {
        const isPaper = trade.id.startsWith('paper-');
        const toastKind =
          exitKind === 'STOP_LOSS' ? 'stop-loss' as const :
          exitKind === 'TARGET' ? 'target' as const :
          exitKind === 'AUTO_SQUARE_OFF' ? 'square-off' as const : 'closed' as const;
        const label =
          exitKind === 'STOP_LOSS' ? '🔴 Stop Loss Hit' :
          exitKind === 'TARGET' ? '🟢 Target Hit' :
          exitKind === 'AUTO_SQUARE_OFF' ? 'Market Auto Square Off' :
          exitTrigger === 'AI_REVERSAL' ? 'AI Reversal Exit' : 'Trade Closed';

        if (isPaper) {
          const exitTime = Date.now();
          useOptionChainToastStore.getState().push(toastKind, `${label} — ${tradeLabel(trade)}`);
          logTransition('initiateExit (paper)', { id: trade.id, exitKind, finalStatus, exitPrice });
          set({
            activeTrade: { ...trade, currentLTP: exitPrice, status: finalStatus, exitTime, exitTrigger },
            history: [makeCompleted(trade, exitPrice, exitKind, exitTime, exitTrigger), ...get().history],
          });
          return;
        }

        // Live trade — mark pending immediately (blocks re-triggering on the
        // next tick and can drive an "Exiting…" UI state) and place a real
        // broker SELL order before this app is allowed to consider the
        // position closed.
        set({ activeTrade: { ...trade, exitPending: true } });
        void performExit(trade, exitPrice, exitKind, finalStatus, exitTrigger, label, toastKind);
      };

      const performExit = async (
        trade: ActiveOptionTrade,
        intendedExitPrice: number,
        exitKind: OptionExitKind,
        finalStatus: ActiveOptionTrade['status'],
        exitTrigger: 'AI_REVERSAL' | undefined,
        label: string,
        toastKind: 'stop-loss' | 'target' | 'square-off' | 'closed',
      ): Promise<void> => {
        if (exitInFlight) return;
        exitInFlight = true;
        try {
          const exitReq = {
            strike: trade.strike,
            side: trade.side,
            expiryRaw: trade.expiryRaw,
            quantity: trade.quantity,
            productType: trade.productType,
          };
          const result = await exitOptionOrder(exitReq);
          const current = get().activeTrade;
          // The trade could have already been resolved another way while
          // this awaited (e.g. the user clicked Exit at the same moment) —
          // don't double-record it.
          if (!current || current.id !== trade.id || current.status !== 'OPEN') return;

          const exitTime = Date.now();
          const exitPrice = result.filledPrice > 0 ? result.filledPrice : intendedExitPrice;
          useOptionChainToastStore.getState().push(
            toastKind, `${label} — ${tradeLabel(current)} (real order ${result.brokerOrderId})`,
          );
          logTransition('performExit (live, success)', {
            id: trade.id, exitKind, finalStatus, exitPrice, brokerOrderId: result.brokerOrderId,
          });
          set({
            activeTrade: { ...current, currentLTP: exitPrice, status: finalStatus, exitTime, exitTrigger, exitPending: false },
            history: [makeCompleted({ ...current, currentLTP: exitPrice }, exitPrice, exitKind, exitTime, exitTrigger), ...get().history],
          });
        } catch (err) {
          const message = (err as Error).message;
          const current = get().activeTrade;
          if (current && current.id === trade.id) {
            // "Nothing to exit" means the backend checked Angel One's real
            // position book and found no open quantity for this contract —
            // i.e. the position is ALREADY closed for real (the user exited
            // it manually in Angel One, or the broker's own EOD square-off
            // got there first). Retrying that forever would just spam failed
            // orders and toasts on a position that's genuinely already gone,
            // so this one specific case finalizes locally instead of retrying.
            const alreadyClosedOnBroker = message.toLowerCase().includes('nothing to exit');
            if (alreadyClosedOnBroker) {
              const exitTime = Date.now();
              useOptionChainToastStore.getState().push(
                toastKind,
                `${tradeLabel(current)} was already closed on your broker (not through this app) — reconciled locally at the last known price.`,
              );
              logTransition('performExit (live, already closed on broker)', { id: trade.id, exitKind, message });
              set({
                activeTrade: { ...current, currentLTP: intendedExitPrice, status: finalStatus, exitTime, exitTrigger, exitPending: false },
                history: [makeCompleted({ ...current, currentLTP: intendedExitPrice }, intendedExitPrice, exitKind, exitTime, exitTrigger), ...get().history],
              });
              return;
            }

            // Any other failure (network blip, session expired, margin
            // check, etc.) — the position is still genuinely open on the
            // broker, so clear the pending flag and let the next live-quote
            // tick (or a manual Exit click) retry. Never silently give up.
            set({ activeTrade: { ...current, exitPending: false } });
          }
          logTransition('performExit (live, FAILED)', { id: trade.id, exitKind, message });
          useOptionChainToastStore.getState().push(
            'rejected',
            `⚠️ Automatic exit FAILED for ${tradeLabel(trade)} — the position is likely still OPEN on your broker. ${message} — retrying automatically, or exit manually in Angel One now.`,
          );
        } finally {
          exitInFlight = false;
        }
      };

      return {
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
        // Paper Trading uses its own configured simulated lot size. A real
        // (non-paper) order must use the REAL lot size for this contract's
        // expiry, sourced live from the Angel One instrument master and
        // passed in by the caller (params.lotSize) — never a hardcoded
        // constant, since NSE lot sizes change between contract cycles.
        // Computed before the broker call since a real order must state its
        // quantity upfront — unlike the paper fill, which only needed a price.
        const usedAdapterId = risk.paperTradingOnly ? 'PAPER' : getActiveBrokerAdapter().id;
        let lotSize: number;
        if (usedAdapterId === 'PAPER') {
          lotSize = getPaperLotSize('NIFTY');
        } else {
          if (!params.lotSize || params.lotSize <= 0) {
            set({ tradeError: 'Live lot size unavailable from the broker instrument master — refresh the option chain and try again.' });
            return false;
          }
          lotSize = params.lotSize;
        }
        const quantity = lotSize * params.lots;

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

      updateLTP: (ltp) => {
        const trade = get().activeTrade;
        if (!trade || trade.status !== 'OPEN') return;

        // A real exit order is already in flight for this trade — keep the
        // displayed price live, but don't re-trigger another exit attempt
        // (performExit itself is the retry path if that order fails).
        if (trade.exitPending) {
          set({ activeTrade: { ...trade, currentLTP: +ltp.toFixed(2) } });
          return;
        }

        if (trade.autoExitEnabled) {
          if (ltp <= trade.stopLoss) {
            logTransition('updateLTP (SL branch)', {
              id: trade.id, incomingLtp: ltp, stopLoss: trade.stopLoss, entryPrice: trade.entryPrice,
              reason: 'ltp <= trade.stopLoss', newStatus: 'SL_HIT',
            });
            initiateExit(trade, trade.stopLoss, 'STOP_LOSS', 'SL_HIT');
            return;
          }
          if (ltp >= trade.target) {
            logTransition('updateLTP (target branch)', {
              id: trade.id, incomingLtp: ltp, target: trade.target, entryPrice: trade.entryPrice,
              reason: 'ltp >= trade.target', newStatus: 'TARGET_HIT',
            });
            initiateExit(trade, trade.target, 'TARGET', 'TARGET_HIT');
            return;
          }
        }

        set({ activeTrade: { ...trade, currentLTP: +ltp.toFixed(2) } });
      },

      exitTrade: (trigger) => {
        const trade = get().activeTrade;
        if (!trade || trade.status !== 'OPEN' || trade.exitPending) return;
        logTransition('exitTrade', {
          id: trade.id, trigger: trigger ?? 'manual (Exit button)', exitPrice: trade.currentLTP, newStatus: 'MANUAL_EXIT',
        });
        initiateExit(trade, trade.currentLTP, 'MANUAL', 'MANUAL_EXIT', trigger);
      },

      autoSquareOff: () => {
        const trade = get().activeTrade;
        if (!trade || trade.status !== 'OPEN' || trade.exitPending) return;
        // CARRYFORWARD (NRML) trades are intentionally held overnight — the
        // 3:20 PM intraday square-off must never touch them.
        if (trade.productType === 'CARRYFORWARD') return;
        logTransition('autoSquareOff', {
          id: trade.id, currentLTP: trade.currentLTP, newStatus: 'AUTO_SQUARE_OFF',
          note: 'Called from useOptionTradeMonitor.ts tick — should NOT fire while Dev Testing Mode is on',
        });
        initiateExit(trade, trade.currentLTP, 'AUTO_SQUARE_OFF', 'AUTO_SQUARE_OFF');
      },

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
      };
    },
    {
      name: 'option-trade-store',
      version: 7,
      // Pre-v4 trades predate stopLoss/target/strategyName on history
      // entries (needed by the standalone Trade History page). v5 adds
      // orderType/productType (needed by autoSquareOff's CARRYFORWARD
      // exemption). Validate shape directly (not just the version number)
      // so any stale/partial persisted data from an older build is
      // discarded instead of being merged in and breaking the panel with
      // undefined fields.
      //
      // v7 — one-time full reconciliation for 2026-07-09: before the real-
      // exit-order fix (see initiateExit/performExit above), SL hits only
      // updated LOCAL state and never told Angel One to actually close the
      // position — and two browser tabs (this one + a separate VS Code
      // preview tab) were independently running Auto Trading against the
      // same real Angel One account at once, so each tab's local history
      // only ever recorded its own half of the day's real fills. Neither
      // browser's local total matched reality. This replaces every local
      // NIFTY 24250/24300/24350 CE entry for 2026-07-09 with the complete,
      // real set reconstructed directly from Angel One's own trade book
      // (GET /api/broker/ANGEL_ONE/trades — 16 real fills, verified to sum
      // to the exact same per-symbol P&L Angel One itself reports:
      // 24250 CE +334.75, 24300 CE -136.50, 24350 CE -42.25 = +156.00 total)
      // — so both tabs converge on the same, correct numbers once each
      // reloads. Runs exactly once (ties to this exact version bump).
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

        // Real fills for 2026-07-09, FIFO-paired from Angel One's trade
        // book (each BUY matched with the next SELL on that exact contract).
        const REAL_2026_07_09_ROUNDTRIPS: Array<{
          orderId: string; strike: number; entryPrice: number; exitPrice: number;
          entryTime: number; exitTime: number;
        }> = [
          { orderId: '260709000634047', strike: 24250, entryPrice: 65.20, exitPrice: 65.80, entryTime: 1783579157000, exitTime: 1783584366000 },
          { orderId: '260709000849951', strike: 24250, entryPrice: 61.50, exitPrice: 66.70, entryTime: 1783584424000, exitTime: 1783584545000 },
          { orderId: '260709000857632', strike: 24250, entryPrice: 66.45, exitPrice: 66.45, entryTime: 1783584546000, exitTime: 1783584601000 },
          { orderId: '260709000874901', strike: 24250, entryPrice: 63.80, exitPrice: 62.75, entryTime: 1783584945000, exitTime: 1783584957000 },
          { orderId: '260709000877988', strike: 24250, entryPrice: 62.65, exitPrice: 63.05, entryTime: 1783585008000, exitTime: 1783585078000 },
          { orderId: '260709000867406', strike: 24300, entryPrice: 49.70, exitPrice: 49.10, entryTime: 1783584730000, exitTime: 1783584782000 },
          { orderId: '260709000875549', strike: 24300, entryPrice: 49.05, exitPrice: 47.55, entryTime: 1783584960000, exitTime: 1783584968000 },
          { orderId: '260709000861432', strike: 24350, entryPrice: 40.10, exitPrice: 39.45, entryTime: 1783584610000, exitTime: 1783584617000 },
        ];
        const RECONCILED_STRIKES = new Set([24250, 24300, 24350]);
        const RECONCILED_DAY_KEY = '2026-6-9'; // istDateKey format: year-monthIndex-day (month is 0-based)

        const untouchedHistory = (p!.history as CompletedOptionTrade[]).filter((h) => {
          const wasReconciledDay = istDateKey(h.entryTime) === RECONCILED_DAY_KEY;
          const isReconciledContract = RECONCILED_STRIKES.has(h.strike) && h.side === 'CE';
          return !(wasReconciledDay && isReconciledContract);
        });

        const RECON_LOT_SIZE = 65;
        const reconciledEntries: CompletedOptionTrade[] = REAL_2026_07_09_ROUNDTRIPS.map((r) => {
          const pnlPerUnit = r.exitPrice - r.entryPrice;
          return {
            id: `recon-${r.orderId}`,
            strike: r.strike,
            side: 'CE',
            expiry: '14 Jul 2026',
            entryPrice: r.entryPrice,
            exitPrice: r.exitPrice,
            orderType: 'MARKET',
            productType: 'INTRADAY',
            lotSize: RECON_LOT_SIZE,
            lots: 1,
            quantity: RECON_LOT_SIZE,
            investment: +(r.entryPrice * RECON_LOT_SIZE).toFixed(2),
            pnlAmount: +(pnlPerUnit * RECON_LOT_SIZE).toFixed(2),
            pnlPercent: +((pnlPerUnit / r.entryPrice) * 100).toFixed(2),
            exitReason: 'Reconciled with Angel One’s real trade book (2026-07-09) — this app’s original local record for this trade was wrong or missing.',
            exitKind: 'MANUAL',
            entryTime: r.entryTime,
            exitTime: r.exitTime,
            stopLoss: +(r.entryPrice * 0.97).toFixed(2),
            target: +(r.entryPrice * 1.07).toFixed(2),
            strategyName: 'Manual (Option Chain)',
          };
        });

        return {
          ...(p as OptionTradeState),
          history: [...reconciledEntries, ...untouchedHistory].sort((a, b) => b.exitTime - a.exitTime),
        };
      },
    },
  ),
);
