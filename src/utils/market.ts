import { MARKET_HOURS } from './constants';

/**
 * Returns true if Indian markets (NSE/BSE) are currently open.
 * Mon-Fri, 09:15 - 15:30 IST.
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false; // weekend

  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const minutes = hour * 60 + minute;

  const open = MARKET_HOURS.OPEN_HOUR * 60 + MARKET_HOURS.OPEN_MINUTE;
  const close = MARKET_HOURS.CLOSE_HOUR * 60 + MARKET_HOURS.CLOSE_MINUTE;

  return minutes >= open && minutes <= close;
}

export function getMarketStatus(): 'open' | 'closed' | 'pre-open' {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return 'closed';

  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const preOpen = 9 * 60;
  const open = MARKET_HOURS.OPEN_HOUR * 60 + MARKET_HOURS.OPEN_MINUTE;
  const close = MARKET_HOURS.CLOSE_HOUR * 60 + MARKET_HOURS.CLOSE_MINUTE;

  if (minutes < preOpen || minutes > close) return 'closed';
  if (minutes < open) return 'pre-open';
  return 'open';
}
