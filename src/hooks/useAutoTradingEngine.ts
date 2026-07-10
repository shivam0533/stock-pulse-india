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
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { isDevTestingModeEnabled } from '@config/devTestingMode';
import { isMarketOpen } from '@utils/market';

const CHECK_INTERVAL_MS = 8000;
/** Auto Trading operates on the nearest expiry — same default the Option Chain page itself starts on. */
const DEFAULT_EXPIRY_INDEX = 0;

// TEMP DIAGNOSTIC — traces every single Auto Trading evaluation to find the
// exact runtime condition blocking execution. Purely additive logging; does
// not change any gate, order, or threshold below. Safe to remove once the
// live investigation is done. Relayed to the backend (fire-and-forget) so it
// can be observed without browser DevTools access.
type DiagField = string | number | boolean;

function relayLog(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
  const apiOrigin = import.meta.env.VITE_API_URL ?? '';
  fetch(`${apiOrigin}/api/debug-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  }).catch(() => {
    // Best-effort — never let the debug relay itself affect the engine.
  });
}

function printAutoTradingDiagnostics(fields: Record<string, DiagField>, decision: 'EXECUTE' | 'SKIP', reason?: string): void {
  const lines = [
    '==============================',
    'AUTO TRADING ENGINE',
    '==============================',
    ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`),
    '',
    `Decision: ${decision}`,
  ];
  if (decision === 'SKIP' && reason) {
    lines.push(`SKIP because: ${reason}`);
  }
  relayLog(lines.join('\n'));
}

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
      const riskStore = useOptionChainRiskStore.getState();
      const brokerConn = useBrokerConnectionStore.getState().connections.ANGEL_ONE;
      const brokerConnected = !!brokerConn && brokerConn.sessionExpiresAt > Date.now();
      const marketOpen = isMarketOpen();
      const d0 = dataRef.current;
      const liveDataFresh = !!d0 && Date.now() - d0.updatedAt < 10_000;

      // Fields known before any gate runs — printed on every single
      // evaluation regardless of where the function exits below.
      const diag: Record<string, DiagField> = {
        'Current Time': new Date().toLocaleTimeString('en-IN', { hour12: false }),
        'Market Open': marketOpen,
        'Broker Connected': brokerConnected,
        'WebSocket/Live Data Stream Active': liveDataFresh ? 'YES (tick < 10s old)' : 'NO (stale or no data yet)',
        'Latest Tick Received': d0 ? new Date(d0.updatedAt).toLocaleTimeString('en-IN', { hour12: false }) : 'N/A (no data yet)',
        'AI Running': !!d0,
        'Paper Trading': riskStore.paperTradingOnly,
        'Auto Trading': auto.enabled,
        'Cooldown Active': 'N/A (no cooldown mechanism exists in this codebase)',
      };

      if (!auto.enabled) {
        // OFF — AI only recommends, nothing executes
        printAutoTradingDiagnostics({ ...diag, 'Existing Position': 'N/A (not reached)', 'Ready To Execute': false }, 'SKIP', 'Auto Trading = FALSE');
        return;
      }

      // Live Auto Trading safety checkpoint: Paper Trading Only turns off
      // automatically the moment a real broker connects (handled elsewhere),
      // but this engine additionally requires one explicit, one-time
      // acknowledgment before it will place a real order — it never places
      // real trades just because the toggle above happens to be on.
      const isLiveMode = !riskStore.paperTradingOnly;
      diag['Broker Ready (Live Trading Acknowledged)'] = isLiveMode ? auto.liveTradingAcknowledged : 'N/A (paper mode)';
      if (isLiveMode && !auto.liveTradingAcknowledged) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Live Auto Trading needs your one-time acknowledgment in Risk Management');
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', 'Broker Adapter returned FALSE — Live Trading Acknowledged = FALSE (Risk Management → Auto Trading panel checkbox is unchecked)');
        return;
      }

      const d = dataRef.current;
      if (!d) {
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', 'No Option Chain data received yet');
        return;
      }

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
      diag['Existing Position'] = activeTrade?.status === 'OPEN';
      if (activeTrade?.status === 'OPEN') {
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', 'Existing Position = TRUE');
        return;
      }

      diag['Max Open Positions Reached'] = auto.maxOpenPositions < 1;
      if (auto.maxOpenPositions < 1) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Max open positions reached');
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', 'Max Open Positions Reached = TRUE');
        return;
      }

      const stats = computeOptionTradeSummary(tradeStore.history, tradeStore.statsResetAt);
      diag['Max Trades Reached'] = stats.todayTrades >= auto.maxTradesPerDay;
      if (stats.todayTrades >= auto.maxTradesPerDay) {
        statusStore.set('WAITING_FOR_SIGNAL', `Max trades/day (${auto.maxTradesPerDay}) reached`);
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', `Max Trades Reached = TRUE (${stats.todayTrades}/${auto.maxTradesPerDay})`);
        return;
      }
      diag['Daily Loss Limit Hit'] = auto.maxDailyLoss > 0 && stats.todayPnlAmount <= -Math.abs(auto.maxDailyLoss);
      if (auto.maxDailyLoss > 0 && stats.todayPnlAmount <= -Math.abs(auto.maxDailyLoss)) {
        statusStore.set('WAITING_FOR_SIGNAL', 'Daily loss limit reached — paused for today');
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', 'Daily Loss Limit Hit = TRUE');
        return;
      }

      const { minLTP, maxLTP } = useAITradeSelectionStore.getState();
      // Single source of truth fix: selectBestTrade() used to decide
      // SELECT/WAIT against its own hardcoded 80% (SELECTION_CONFIDENCE_
      // THRESHOLD in aiDecisionEngine.service.ts), completely ignoring this
      // store's user-configured minConfidence — so lowering it in Risk
      // Management had no effect on execution. Now explicitly passed through.
      diag['Configured Confidence from UI'] = auto.minConfidence;
      diag['Stored Confidence'] = useAutoTradingStore.getState().minConfidence;
      diag['Threshold Used By Engine'] = auto.minConfidence;
      const result = selectBestTrade(
        { strikes: d.strikes, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain },
        { minLTP, maxLTP },
        auto.minConfidence,
      );
      diag['Selected Strike'] = result.best?.strike ?? 'N/A (no SELECT)';
      diag['Selected CE/PE'] = result.best?.side ?? 'N/A';
      diag['Current LTP'] = result.best?.ltp ?? 'N/A';
      diag['Runtime Confidence'] = result.best?.confidence ?? 'N/A';
      diag['Confidence'] = result.best?.confidence ?? 'N/A';

      if (result.recommendation !== 'SELECT' || !result.best) {
        statusStore.set('WAITING_FOR_SIGNAL', result.reason);
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', `AI recommendation = WAIT (${result.reason})`);
        return;
      }
      if (result.best.action !== 'BUY') {
        // No sell/write flow exists to execute this — SELL stays display-only,
        // but the panel must say so instead of looking silently stuck.
        statusStore.set(
          'WAITING_FOR_SIGNAL',
          `Best setup right now is a SELL (${result.best.side} ${result.best.strike}, ${result.best.confidence}% confidence) — Auto Trading only executes BUY signals`,
        );
        printAutoTradingDiagnostics({ ...diag, 'Ready To Execute': false }, 'SKIP', `AI best action = SELL, not BUY (Auto Trading never executes SELL — no sell/write flow exists)`);
        return;
      }
      // No separate confidence re-check here anymore — selectBestTrade()
      // above is now the single source of truth for the confidence gate,
      // using this exact auto.minConfidence value.

      diag['Risk Validation'] = 'PASSED (pre-checks) — final validation runs inside openTrade()';
      diag['SL/Target Validation'] = 'Computed by openTrade() from Risk Management % at fill time';
      diag['Ready To Execute'] = true;
      printAutoTradingDiagnostics(diag, 'EXECUTE');
      relayLog('[AutoTradingEngine] openTrade()\n  ↓\n  Broker Request → ' + JSON.stringify({
        strike: result.best.strike, side: result.best.side, expiry: d.expiry.label,
        expiryRaw: d.expiry.raw, entryPrice: result.best.ltp, lots: auto.lots,
        lotSize: d.expiry.lotSize,
      }));

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
        lotSize: d.expiry.lotSize,
      });

      if (opened) {
        const openedTrade = useOptionTradeStore.getState().activeTrade;
        relayLog(
          '[AutoTradingEngine] Broker Response → SUCCESS\n' +
          '  ↓\n  Order ID: ' + openedTrade?.id +
          '\n  ↓\n  Position Created: ' + !!openedTrade +
          '\n  ↓\n  Trade History Updated: (recorded on exit, not entry)' +
          '\n  ↓\n  SL/Target Monitor Started: useOptionTradeMonitor.ts (already globally mounted)',
        );
      } else {
        relayLog('[AutoTradingEngine] Broker Response → REJECTED: ' + useOptionTradeStore.getState().tradeError);
      }

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
