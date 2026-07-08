import { useEffect, useRef } from 'react';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { useOptionTradeStore } from '@store/optionTrade.store';

const CHECK_INTERVAL_MS = 500; // same cadence as the LTP simulation in useOptionTradeMonitor

/**
 * Optional Trailing Stop Loss (off by default). Purely additive on top of
 * the existing, unchanged Stop Loss (3%) / Target (7%) logic in
 * optionTrade.store.ts — this hook only ever RAISES the active trade's
 * stopLoss as the LTP makes new highs since entry, via the store's dedicated
 * raiseStopLoss() action, which itself refuses to lower the stop or touch
 * anything else. The existing exit check (`ltp <= trade.stopLoss` inside
 * updateLTP) is completely untouched — a trailing stop simply makes that
 * same check fire earlier as price pulls back from its peak.
 *
 * Mounted once, globally (alongside useAutoTradingEngine), so it keeps
 * trailing regardless of which page is open.
 */
export function useTrailingStopEngine() {
  const peakLtpRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const { trailingStopEnabled, trailingStopPercent } = useAutoTradingStore.getState();
      const trade = useOptionTradeStore.getState().activeTrade;

      if (!trailingStopEnabled || !trade || trade.status !== 'OPEN') {
        peakLtpRef.current = null;
        return;
      }

      const peak = Math.max(peakLtpRef.current ?? trade.entryPrice, trade.currentLTP);
      peakLtpRef.current = peak;

      const trailingSL = peak * (1 - trailingStopPercent / 100);
      if (trailingSL > trade.stopLoss) {
        useOptionTradeStore.getState().raiseStopLoss(trailingSL);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);
}
