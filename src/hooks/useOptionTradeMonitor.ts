import { useEffect, useRef } from 'react';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { optionsService } from '@services/options.service';
import { isDevTestingModeEnabled } from '@config/devTestingMode';

// ── Price simulation constants (Paper Trading only) ─────────────────────────
const TICK_MS    = 500;   // update every 500 ms
const VOLATILITY = 0.003; // ±0.3 % per tick (random walk)

// ── Live quote polling (real Angel One LTP) ─────────────────────────────────
// Gentler cadence than the synthetic walk — this is a real network call.
const LIVE_QUOTE_POLL_MS = 2000;

// ── Auto square-off — intraday only, 3:20 PM IST ────────────────────────────
const SQUARE_OFF_IST_MINUTES = 15 * 60 + 20; // 15:20

// IST is a fixed UTC+5:30 offset (no DST) — Date.getTime() is already an
// absolute, timezone-independent epoch, so adding this once is all that's
// needed. Do not also add date.getTimezoneOffset() (the browser's local
// offset) on top of this — that makes the result silently collapse back to
// plain UTC for users physically in India (see src/utils/market.ts's istNow,
// which already fixed this same bug once).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istMinutesSinceMidnight(): number {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/**
 * Drives the active option trade's currentLTP and feeds it into the store,
 * which handles auto-exit on SL/Target — unchanged either way. Also
 * force-closes any open trade at 3:20 PM IST (intraday square-off), unless
 * Developer Testing Mode is on (never true in production — see
 * devTestingMode.ts).
 *
 * Two mutually-exclusive sources for currentLTP:
 *  - Live (Paper Trading Only OFF + this trade has a resolvable real
 *    contract, i.e. it was opened against live Angel One data): polls the
 *    real backend quote endpoint — real Live P&L, no synthetic movement.
 *  - Paper (everything else): the synthetic random-walk simulation.
 */
export function useOptionTradeMonitor() {
  const activeTrade      = useOptionTradeStore((s) => s.activeTrade);
  const updateLTP        = useOptionTradeStore((s) => s.updateLTP);
  const autoSquareOff    = useOptionTradeStore((s) => s.autoSquareOff);
  const paperTradingOnly = useOptionChainRiskStore((s) => s.paperTradingOnly);
  const ltpRef = useRef(activeTrade?.currentLTP ?? 0);

  useEffect(() => {
    if (activeTrade) ltpRef.current = activeTrade.currentLTP;
  }, [activeTrade?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLiveContract = !paperTradingOnly && !!activeTrade?.expiryRaw;

  // Real live LTP polling — only for a live-mode trade with a resolvable real contract.
  useEffect(() => {
    if (!activeTrade?.id || activeTrade.status !== 'OPEN' || !isLiveContract) return;
    let cancelled = false;

    const poll = async () => {
      if (!isDevTestingModeEnabled() && istMinutesSinceMidnight() >= SQUARE_OFF_IST_MINUTES) {
        autoSquareOff();
        return;
      }
      try {
        const ltp = await optionsService.getLiveQuote(activeTrade.strike, activeTrade.side, activeTrade.expiryRaw!);
        if (!cancelled && ltp > 0) {
          ltpRef.current = ltp;
          updateLTP(ltp);
        }
      } catch {
        // Transient network/API failure — keep the last known LTP, retry next tick.
      }
    };

    poll();
    const id = setInterval(poll, LIVE_QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTrade?.id, activeTrade?.status, activeTrade?.strike, activeTrade?.side, activeTrade?.expiryRaw, isLiveContract, updateLTP, autoSquareOff]);

  // Synthetic price simulation + intraday square-off — Paper Trading only.
  useEffect(() => {
    if (!activeTrade?.id || activeTrade.status !== 'OPEN' || isLiveContract) return;

    // TEMP DIAGNOSTIC — confirms whether the tick loop even started for this
    // trade, and what Dev Testing Mode resolves to at that moment.
    if (isDevTestingModeEnabled()) {
      // eslint-disable-next-line no-console
      console.log('[TradeLifecycle] useOptionTradeMonitor.ts:tick-loop-start', {
        tradeId: activeTrade.id, status: activeTrade.status,
        devTestingModeEnabled: true, istMinutesNow: istMinutesSinceMidnight(),
      });
    }

    const id = setInterval(() => {
      const devMode = isDevTestingModeEnabled();
      const istMinutesNow = istMinutesSinceMidnight();
      const pastCutoff = istMinutesNow >= SQUARE_OFF_IST_MINUTES;

      // TEMP DIAGNOSTIC — every tick, so a premature close is unambiguous:
      // either this fires autoSquareOff (and says so) or it doesn't.
      if (devMode) {
        // eslint-disable-next-line no-console
        console.log('[TradeLifecycle] useOptionTradeMonitor.ts:tick', {
          tradeId: activeTrade.id, devMode, istMinutesNow, cutoff: SQUARE_OFF_IST_MINUTES, pastCutoff,
          willCallAutoSquareOff: !devMode && pastCutoff, currentLtpRef: ltpRef.current,
        });
      }

      // Developer Testing Mode (never true in production — see
      // devTestingMode.ts) skips the intraday cutoff only, so live ticking
      // can be observed outside market hours. Everything else below —
      // Stop Loss, Target, P&L math — is completely unchanged either way.
      if (!devMode && pastCutoff) {
        autoSquareOff();
        return;
      }
      const delta = ltpRef.current * (Math.random() - 0.5) * VOLATILITY;
      const next  = Math.max(0.05, ltpRef.current + delta);
      ltpRef.current = next;
      updateLTP(next);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [activeTrade?.id, activeTrade?.status, isLiveContract, updateLTP, autoSquareOff]);
}
