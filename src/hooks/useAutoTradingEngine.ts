import { useEffect, useRef } from 'react';
import { useOptionChain } from '@hooks/useOptionChain';
import { generateAISignal, selectBestTrade } from '@services/aiDecisionEngine.service';
import { computeOptionTradeSummary } from '@services/optionTradeStats.service';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { useAITradeSelectionStore } from '@store/aiTradeSelection.store';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useOptionChainToastStore } from '@store/optionChainToast.store';
import { useAutoTradingStatusStore } from '@store/autoTradingStatus.store';
import { isDevTestingModeEnabled } from '@config/devTestingMode';

const CHECK_INTERVAL_MS = 8000;
/** Auto Trading operates on the nearest expiry — same default the Option Chain page itself starts on. */
const DEFAULT_EXPIRY_INDEX = 0;

/**
 * Auto Trading execution engine. Mounted once, globally, so it keeps
 * watching regardless of which page is open.
 *
 * This does NOT introduce a new execution engine — it only calls the
 * existing selectBestTrade() (AI Trade Selection), generateAISignal()
 * (AI Decision Engine), and the existing openTrade()/exitTrade() (the exact
 * functions the manual Order Window and Active Trade panel use). Stop Loss
 * %, Target Profit %, Auto Apply and Paper Trading Only are read by
 * openTrade() itself from the existing useOptionChainRiskStore, completely
 * untouched here.
 *
 * The existing trading system only ever supports BUYING an option (there is
 * no sell/write flow anywhere in this app), so Auto Trading only acts when
 * the AI's pick is BUY_CE or BUY_PE. SELL_CE/SELL_PE recommendations remain
 * display-only, exactly as when Auto Trading is off.
 *
 * Lots come only from the user-configured autoTrading.store — the AI never
 * decides lots, quantity, margin, or capital. Every other guard rail
 * (Minimum Confidence, Max Trades/Day, Max Daily Loss, Max Open Positions,
 * AI Reversal Exit) is also user-configured there and checked below, on top
 * of — never instead of — the existing 80% AI Trade Selection threshold and
 * the existing one-trade-at-a-time rule.
 */
export function useAutoTradingEngine() {
  const { data } = useOptionChain(DEFAULT_EXPIRY_INDEX);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Reactive status — reflects the open trade's own lifecycle the instant it
  // changes (Target/Stop Loss hit are driven by useOptionTradeMonitor's tick,
  // not this engine's 8s cadence, so this must react independently of it).
  const enabled = useAutoTradingStore((s) => s.enabled);
  const activeTradeStatus = useOptionTradeStore((s) => s.activeTrade?.status);

  useEffect(() => {
    const statusStore = useAutoTradingStatusStore.getState();
    if (!enabled) {
      statusStore.set('IDLE');
      return;
    }
    if (activeTradeStatus === 'OPEN') statusStore.set('POSITION_ACTIVE');
    else if (activeTradeStatus === 'TARGET_HIT') statusStore.set('TARGET_HIT');
    else if (activeTradeStatus === 'SL_HIT') statusStore.set('STOP_LOSS_HIT');
    else statusStore.set('WAITING_FOR_SIGNAL');
  }, [enabled, activeTradeStatus]);

  useEffect(() => {
    const tick = async () => {
      const auto = useAutoTradingStore.getState();
      const statusStore = useAutoTradingStatusStore.getState();
      if (!auto.enabled) return; // OFF — AI only recommends, nothing executes

      // Live Auto Trading safety checkpoint: Paper Trading Only turns off
      // automatically the moment a real broker connects (handled elsewhere),
      // but this engine additionally requires one explicit, one-time
      // acknowledgment before it will place a real order — it never places
      // real trades just because the toggle above happens to be on.
      const isLiveMode = !useOptionChainRiskStore.getState().paperTradingOnly;
      if (isLiveMode && !auto.liveTradingAcknowledged) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Live Auto Trading needs your one-time acknowledgment in Risk Management');
        return;
      }

      const d = dataRef.current;
      if (!d) return;

      const tradeStore = useOptionTradeStore.getState();
      const openTradeNow = tradeStore.activeTrade;

      // Optional AI Reversal Exit — only while a position is open.
      if (openTradeNow?.status === 'OPEN' && auto.aiReversalExitEnabled) {
        const row = d.strikes.find((s) => s.strike === openTradeNow.strike);
        if (row) {
          const signal = generateAISignal({
            strike: openTradeNow.strike,
            expiry: openTradeNow.expiry,
            spotPrice: d.spotPrice,
            pcr: d.pcr,
            maxPain: d.maxPain,
            row,
          });
          const sameSideAction = openTradeNow.side === 'CE' ? 'BUY_CE' : 'BUY_PE';
          const oppositeAction = openTradeNow.side === 'CE' ? 'BUY_PE' : 'BUY_CE';
          const sameConf = signal.scores.find((s) => s.action === sameSideAction)?.confidence ?? 0;
          const oppConf = signal.scores.find((s) => s.action === oppositeAction)?.confidence ?? 0;

          // exitTrade('AI_REVERSAL') itself pushes the toast — no need to duplicate it here.
          if (oppConf >= auto.minConfidence && oppConf > sameConf) {
            if (isDevTestingModeEnabled()) {
              // TEMP DIAGNOSTIC — proves whether this is the path that closed the trade.
              // eslint-disable-next-line no-console
              console.log('[TradeLifecycle] useAutoTradingEngine.ts:AI-reversal-exit (~line 105)', {
                tradeId: openTradeNow.id, side: openTradeNow.side, strike: openTradeNow.strike,
                sameSideAction, sameConf, oppositeAction, oppConf, minConfidenceRequired: auto.minConfidence,
                aiReversalExitEnabled: auto.aiReversalExitEnabled, autoTradingEnabled: auto.enabled,
              });
            }
            tradeStore.exitTrade('AI_REVERSAL');
          }
        }
      }

      // A position (still, or now) open — don't look for new entries. The
      // underlying trade store only ever holds one active trade at a time,
      // so once we reach here there are zero open positions; Max Open
      // Positions only needs to gate the "0 = pause new entries" case.
      const activeTrade = useOptionTradeStore.getState().activeTrade;
      if (activeTrade?.status === 'OPEN') return;

      if (auto.maxOpenPositions < 1) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Max open positions reached');
        return;
      }

      const stats = computeOptionTradeSummary(tradeStore.history, tradeStore.statsResetAt);
      if (stats.todayTrades >= auto.maxTradesPerDay) {
        statusStore.set('WAITING_FOR_SIGNAL', `Max trades/day (${auto.maxTradesPerDay}) reached`);
        return;
      }
      if (auto.maxDailyLoss > 0 && stats.todayPnlAmount <= -Math.abs(auto.maxDailyLoss)) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Daily loss limit reached — paused for today');
        return;
      }

      const { minLTP, maxLTP } = useAITradeSelectionStore.getState();
      const result = selectBestTrade(
        { strikes: d.strikes, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain },
        { minLTP, maxLTP },
      );

      if (result.recommendation !== 'SELECT' || !result.best) {
        statusStore.set('WAITING_FOR_SIGNAL', result.reason);
        return;
      }
      if (result.best.action !== 'BUY') {
        // No sell/write flow exists to execute this — SELL stays display-only,
        // but the panel must say so instead of looking silently stuck.
        statusStore.set(
          'WAITING_FOR_SIGNAL',
          `Best setup right now is a SELL (${result.best.side} ${result.best.strike}, ${result.best.confidence}% confidence) — Auto Trading only executes BUY signals`,
        );
        return;
      }
      if (result.best.confidence < auto.minConfidence) {
        statusStore.set('WAITING_FOR_SIGNAL', `Best confidence ${result.best.confidence}% below your ${auto.minConfidence}% minimum`);
        return;
      }

      statusStore.set(
        'SIGNAL_FOUND',
        `BUY ${result.best.side} ${result.best.strike} — ${result.best.confidence}% confidence`,
      );

      const opened = await useOptionTradeStore.getState().openTrade({
        strike: result.best.strike,
        side: result.best.side,
        expiry: d.expiry.label,
        expiryRaw: d.expiry.raw,
        entryPrice: result.best.ltp,
        lots: auto.lots,
      });

      if (opened) {
        statusStore.set(
          'ORDER_PLACED',
          `BUY ${result.best.side} ${result.best.strike} × ${auto.lots} lot${auto.lots > 1 ? 's' : ''}`,
        );
        useOptionChainToastStore.getState().push(
          'opened',
          `Auto Trading — BUY ${result.best.side} ${result.best.strike} × ${auto.lots} lot${auto.lots > 1 ? 's' : ''} (${result.best.confidence}% confidence)`,
        );
      } else {
        statusStore.set('WAITING_FOR_SIGNAL', useOptionTradeStore.getState().tradeError ?? undefined);
      }
    };

    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
