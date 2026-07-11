import { useEffect, useRef } from 'react';
import { useOptionChain } from '@hooks/useOptionChain';
import { selectBestTrade } from '@services/aiDecisionEngine.service';
import { AI_TRADE_SELECTION_SETTINGS } from '@store/aiTradeSelection.store';
import { useAutoTradingStore } from '@store/autoTrading.store';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { useNotificationsStore } from '@store/notifications.store';
import { isMarketOpen } from '@utils/market';

const DEFAULT_EXPIRY_INDEX = 0;
const AI_SIGNAL_INTERVAL_MS = 8000;
const MARKET_EVENT_INTERVAL_MS = 20000;
const MARKET_CLOCK_INTERVAL_MS = 30000;
const OI_BUILDUP_THRESHOLD_PCT = 6;
const VOLUME_SPIKE_RATIO = 1.3; // same "spike" definition generateAISignal() itself uses

/**
 * Headless — drives the Notifications drawer (useNotificationsStore) live
 * from real Option Chain / AI Signals / Trading / Risk Management state.
 * Purely additive: reads existing, unmodified stores/services
 * (optionTrade.store, aiDecisionEngine.service, useOptionChain) and only
 * ever calls the new notifications.push() action — never touches the
 * drawer's UI, never mutates trading state. Mounted once, globally, in
 * AppLayout so notifications keep generating regardless of which page is
 * open.
 */
export function NotificationEventBridge() {
  const { data } = useOptionChain(DEFAULT_EXPIRY_INDEX);
  const dataRef = useRef(data);
  dataRef.current = data;

  // ── Trade lifecycle: Trade Executed / Target Hit / Stop Loss Hit / Trailing Stop Exit / AI Reversal Exit
  const activeTrade = useOptionTradeStore((s) => s.activeTrade);
  const prevTradeRef = useRef<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!activeTrade) {
      prevTradeRef.current = null;
      return;
    }

    const prev = prevTradeRef.current;
    const push = useNotificationsStore.getState().push;

    if (!prev || prev.id !== activeTrade.id) {
      if (activeTrade.status === 'OPEN') {
        push({
          type: 'order',
          title: '🟢 Trade Executed',
          message: `Bought ${activeTrade.lots} Lot${activeTrade.lots > 1 ? 's' : ''} of NIFTY ${activeTrade.strike} ${activeTrade.side} — Entry: ₹${activeTrade.entryPrice.toFixed(2)}`,
        });
      }
    } else if (prev.status !== activeTrade.status) {
      const pnlAmount = (activeTrade.currentLTP - activeTrade.entryPrice) * activeTrade.quantity;
      const pnlPercent = ((activeTrade.currentLTP - activeTrade.entryPrice) / activeTrade.entryPrice) * 100;

      if (activeTrade.status === 'TARGET_HIT') {
        push({
          type: 'order',
          title: '🎯 Target Hit',
          message: `NIFTY ${activeTrade.strike} ${activeTrade.side} — Profit: +₹${Math.abs(pnlAmount).toFixed(0)} (+${pnlPercent.toFixed(0)}%)`,
        });
      } else if (activeTrade.status === 'SL_HIT') {
        // Trailing Stop only ever ratchets stopLoss upward (raiseStopLoss()
        // in optionTrade.store.ts) — if it now sits above the originally
        // computed fixed-% stop, this exit was a trailing-stop hit.
        const originalStopLoss = +(activeTrade.entryPrice * (1 - activeTrade.lossPercent / 100)).toFixed(2);
        const trailingEngaged = activeTrade.stopLoss > originalStopLoss + 0.005;
        if (trailingEngaged) {
          push({
            type: 'order',
            title: '🟠 Trailing Stop Exit',
            message: `Profit protected. P&L: ${pnlAmount >= 0 ? '+' : ''}₹${Math.abs(pnlAmount).toFixed(0)}`,
          });
        } else {
          push({
            type: 'order',
            title: '🔴 Stop Loss Hit',
            message: `Trade closed. Loss: ₹${Math.abs(pnlAmount).toFixed(0)} (${pnlPercent.toFixed(0)}%)`,
          });
        }
      } else if (activeTrade.status === 'MANUAL_EXIT' && activeTrade.exitTrigger === 'AI_REVERSAL') {
        push({
          type: 'order',
          title: '🔵 AI Reversal Exit',
          message: 'Trend changed. Trade closed by AI.',
        });
      }
      // Plain Manual Exit and End-of-Day Auto Square-off are intentionally
      // silent here — not part of this feature's requested event list.
    }

    prevTradeRef.current = { id: activeTrade.id, status: activeTrade.status };
  }, [activeTrade]);

  // ── AI BUY Signal — reuses the existing, unmodified selectBestTrade()
  const lastAISignalRef = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = dataRef.current;
      if (!d) return;
      const { minLTP, maxLTP } = AI_TRADE_SELECTION_SETTINGS;
      const result = selectBestTrade(
        { strikes: d.strikes, expiry: d.expiry.label, spotPrice: d.spotPrice, pcr: d.pcr, maxPain: d.maxPain },
        { minLTP, maxLTP },
        useAutoTradingStore.getState().minConfidence,
      );

      if (result.recommendation === 'SELECT' && result.best && result.best.action === 'BUY') {
        const signature = `${result.best.strike}-${result.best.side}`;
        if (signature !== lastAISignalRef.current) {
          lastAISignalRef.current = signature;
          useNotificationsStore.getState().push({
            type: 'price-alert',
            title: '🟢 AI BUY Signal',
            message: `NIFTY ${result.best.strike} ${result.best.side} — AI Confidence: ${result.best.confidence}%`,
          });
        }
      } else {
        lastAISignalRef.current = null; // allow re-notification once a new SELECT reappears
      }
    };

    tick();
    const id = setInterval(tick, AI_SIGNAL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── High OI Build-up / Put OI Build-up / Unusual Volume — scanned across
  // every strike in the current chain snapshot.
  const lastCallOIRef = useRef<string | null>(null);
  const lastPutOIRef  = useRef<string | null>(null);
  const lastVolumeRef = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = dataRef.current;
      if (!d || d.strikes.length === 0) return;
      const push = useNotificationsStore.getState().push;

      let bestCall: { strike: number; pct: number } | null = null;
      let bestPut: { strike: number; pct: number } | null = null;
      let bestVolume: { strike: number; side: 'CE' | 'PE'; ratio: number } | null = null;

      for (const row of d.strikes) {
        const prevCallOI = row.callOI - row.callChgOI;
        if (prevCallOI > 0) {
          const pct = (row.callChgOI / prevCallOI) * 100;
          if (pct >= OI_BUILDUP_THRESHOLD_PCT && (!bestCall || pct > bestCall.pct)) {
            bestCall = { strike: row.strike, pct };
          }
        }

        const prevPutOI = row.putOI - row.putChgOI;
        if (prevPutOI > 0) {
          const pct = (row.putChgOI / prevPutOI) * 100;
          if (pct >= OI_BUILDUP_THRESHOLD_PCT && (!bestPut || pct > bestPut.pct)) {
            bestPut = { strike: row.strike, pct };
          }
        }

        const callBaseline = row.callOI * 0.25;
        if (callBaseline > 0) {
          const ratio = row.callVolume / callBaseline;
          if (ratio >= VOLUME_SPIKE_RATIO && (!bestVolume || ratio > bestVolume.ratio)) {
            bestVolume = { strike: row.strike, side: 'CE', ratio };
          }
        }
        const putBaseline = row.putOI * 0.25;
        if (putBaseline > 0) {
          const ratio = row.putVolume / putBaseline;
          if (ratio >= VOLUME_SPIKE_RATIO && (!bestVolume || ratio > bestVolume.ratio)) {
            bestVolume = { strike: row.strike, side: 'PE', ratio };
          }
        }
      }

      if (bestCall) {
        const sig = String(bestCall.strike);
        if (sig !== lastCallOIRef.current) {
          lastCallOIRef.current = sig;
          push({
            type: 'price-alert',
            title: '📈 High OI Build-up',
            message: `NIFTY ${bestCall.strike} CE — Call Open Interest increased by ${bestCall.pct.toFixed(0)}%.`,
          });
        }
      } else {
        lastCallOIRef.current = null;
      }

      if (bestPut) {
        const sig = String(bestPut.strike);
        if (sig !== lastPutOIRef.current) {
          lastPutOIRef.current = sig;
          push({
            type: 'price-alert',
            title: '📉 Put OI Build-up',
            message: `NIFTY ${bestPut.strike} PE — Put Open Interest increased by ${bestPut.pct.toFixed(0)}%.`,
          });
        }
      } else {
        lastPutOIRef.current = null;
      }

      if (bestVolume) {
        const sig = `${bestVolume.strike}-${bestVolume.side}`;
        if (sig !== lastVolumeRef.current) {
          lastVolumeRef.current = sig;
          push({
            type: 'price-alert',
            title: '⚡ Unusual Volume',
            message: `NIFTY ${bestVolume.strike} ${bestVolume.side} volume increased by ${bestVolume.ratio.toFixed(1)}x.`,
          });
        }
      } else {
        lastVolumeRef.current = null;
      }
    };

    tick();
    const id = setInterval(tick, MARKET_EVENT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── Market Open / Market Closed — fires only on a genuine transition, never on initial mount.
  const marketOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    const tick = () => {
      const open = isMarketOpen();
      if (marketOpenRef.current !== null && marketOpenRef.current !== open) {
        useNotificationsStore.getState().push(
          open
            ? { type: 'system', title: '🔔 Market Open', message: 'NIFTY Option Chain is now active.' }
            : { type: 'system', title: '🔕 Market Closed', message: 'Trading session has ended.' },
        );
      }
      marketOpenRef.current = open;
    };

    tick();
    const id = setInterval(tick, MARKET_CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
