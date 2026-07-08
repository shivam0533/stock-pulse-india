import { useEffect, useRef } from 'react';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { speakAnnouncement } from '@services/voiceAnnouncement.service';
import { decimalToWords, integerToWords, letterByLetter } from '@utils/numberToWords';
import type { ActiveOptionTrade } from '@/types';

function strikeSideWords(trade: Pick<ActiveOptionTrade, 'strike' | 'side'>): string {
  return `NIFTY ${integerToWords(trade.strike)} ${letterByLetter(trade.side)}`;
}

/**
 * Voice Notifications — announces the same trade lifecycle events as the
 * Trade Popup Notification (Trade Executed, Target Hit, Stop Loss Hit,
 * Trailing Stop Exit, AI Reversal Exit, Manual Exit) through the browser
 * SpeechSynthesis API. Purely additive: watches the existing, unmodified
 * optionTrade.store — no store action, page, or existing component is
 * touched. Mounted once, globally, in AppLayout so it works everywhere, for
 * both Paper and Live trading (the store doesn't distinguish the two).
 *
 * The initial ref below is seeded from whatever trade already exists at
 * mount time (rather than null), so a page refresh with an already-open or
 * already-closed trade never re-triggers its announcement.
 */
export function VoiceAnnouncer() {
  const activeTrade = useOptionTradeStore((s) => s.activeTrade);
  const prevRef = useRef<{ id: string; status: string } | null>(
    activeTrade ? { id: activeTrade.id, status: activeTrade.status } : null,
  );

  useEffect(() => {
    if (!activeTrade) {
      prevRef.current = null;
      return;
    }

    const prev = prevRef.current;

    if (!prev || prev.id !== activeTrade.id) {
      if (activeTrade.status === 'OPEN') {
        speakAnnouncement(
          `Trade executed successfully. Bought ${integerToWords(activeTrade.lots)} ` +
          `lot${activeTrade.lots > 1 ? 's' : ''} of ${strikeSideWords(activeTrade)} ` +
          `at ${decimalToWords(activeTrade.entryPrice)} rupees.`,
        );
      }
    } else if (prev.status !== activeTrade.status) {
      const pnlAmount = (activeTrade.currentLTP - activeTrade.entryPrice) * activeTrade.quantity;
      const pnlPercent = ((activeTrade.currentLTP - activeTrade.entryPrice) / activeTrade.entryPrice) * 100;
      const id = strikeSideWords(activeTrade);

      if (activeTrade.status === 'TARGET_HIT') {
        speakAnnouncement(
          `Target hit on ${id}. Profit of ${decimalToWords(Math.abs(pnlAmount), 0)} rupees, ` +
          `${decimalToWords(Math.abs(pnlPercent), 1)} percent.`,
        );
      } else if (activeTrade.status === 'SL_HIT') {
        // Trailing Stop only ever raises stopLoss above the fixed % originally
        // computed (raiseStopLoss() in optionTrade.store.ts) — if it now sits
        // higher than that original value, this exit was a trailing-stop hit.
        const originalStopLoss = +(activeTrade.entryPrice * (1 - activeTrade.lossPercent / 100)).toFixed(2);
        const trailingEngaged = activeTrade.stopLoss > originalStopLoss + 0.005;
        if (trailingEngaged) {
          speakAnnouncement(
            `Trailing stop exit on ${id}. Profit protected at ${decimalToWords(Math.abs(pnlAmount), 0)} rupees.`,
          );
        } else {
          speakAnnouncement(
            `Stop loss hit on ${id}. Loss of ${decimalToWords(Math.abs(pnlAmount), 0)} rupees, ` +
            `${decimalToWords(Math.abs(pnlPercent), 1)} percent.`,
          );
        }
      } else if (activeTrade.status === 'MANUAL_EXIT') {
        if (activeTrade.exitTrigger === 'AI_REVERSAL') {
          speakAnnouncement(`A I reversal exit on ${id}. Trend changed, trade closed by A I.`);
        } else {
          speakAnnouncement(`Manual exit on ${id}. Trade closed by user.`);
        }
      }
      // End-of-Day Auto Square-off is intentionally silent — not part of this feature's requested event list.
    }

    prevRef.current = { id: activeTrade.id, status: activeTrade.status };
  }, [activeTrade]);

  return null;
}
