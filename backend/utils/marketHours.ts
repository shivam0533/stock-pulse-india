/**
 * NSE market hours (9:15 AM – 3:30 PM IST, Mon-Fri), computed from the
 * absolute epoch — never the server process's local timezone. IST is a
 * fixed UTC+5:30 offset (no DST), so adding it once to Date.now() and
 * reading the UTC getters back off the shifted value yields true IST
 * wall-clock fields regardless of where this process runs. Do not use
 * date.getTimezoneOffset() here — that reads the *server's* local offset,
 * which silently produces the wrong answer on any host not already set to
 * UTC (this exact class of bug was found and fixed once already this
 * session, in the frontend's own square-off timer).
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MARKET_OPEN_MINUTES = 9 * 60 + 15;  // 9:15 AM
const MARKET_CLOSE_MINUTES = 15 * 60 + 30; // 3:30 PM

function istNow(): { day: number; minutes: number } {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return { day: ist.getUTCDay(), minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
}

export function isMarketOpen(): boolean {
  const { day, minutes } = istNow();
  if (day === 0 || day === 6) return false; // weekend
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
}
