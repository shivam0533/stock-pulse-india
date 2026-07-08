import { MARKET_HOURS } from './constants';

// IST is a fixed UTC+5:30 offset (no DST) — Date.getTime() is already an
// absolute, timezone-independent epoch, so adding this once is all that's
// needed. The previous implementation also added date.getTimezoneOffset()
// (the BROWSER's local offset) on top of that, which made the "IST" result
// silently drift by however far the user's own machine/browser timezone is
// from UTC+0 — including for users physically in India, where it collapsed
// back to plain UTC. Reading the UTC getters on `ist` below yields true IST
// wall-clock fields regardless of the browser's local timezone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istNow(date: Date): { day: number; minutes: number } {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    day: ist.getUTCDay(),
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
  };
}

/**
 * Returns true if Indian markets (NSE/BSE) are currently open.
 * Mon-Fri, 09:15 - 15:30 IST (Asia/Kolkata) — always IST, never the local
 * browser timezone.
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  const { day, minutes } = istNow(date);
  if (day === 0 || day === 6) return false; // weekend

  const open = MARKET_HOURS.OPEN_HOUR * 60 + MARKET_HOURS.OPEN_MINUTE;
  const close = MARKET_HOURS.CLOSE_HOUR * 60 + MARKET_HOURS.CLOSE_MINUTE;

  return minutes >= open && minutes <= close;
}

/**
 * NSE session status in IST (Asia/Kolkata), always computed from the
 * absolute clock — never the local browser timezone:
 *  - Closed:    12:00 AM – 9:00 AM IST
 *  - Pre-Open:   9:00 AM – 9:15 AM IST
 *  - Open:       9:15 AM – 3:30 PM IST
 *  - Closed:     3:30 PM – 11:59 PM IST
 */
export function getMarketStatus(date: Date = new Date()): 'open' | 'closed' | 'pre-open' {
  const { day, minutes } = istNow(date);
  if (day === 0 || day === 6) return 'closed';

  const preOpen = 9 * 60; // 9:00 AM IST
  const open = MARKET_HOURS.OPEN_HOUR * 60 + MARKET_HOURS.OPEN_MINUTE;   // 9:15 AM IST
  const close = MARKET_HOURS.CLOSE_HOUR * 60 + MARKET_HOURS.CLOSE_MINUTE; // 3:30 PM IST

  if (minutes < preOpen || minutes > close) return 'closed';
  if (minutes < open) return 'pre-open';
  return 'open';
}
