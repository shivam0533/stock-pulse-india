/**
 * Kotak Neo (Kotak Securities Trade API) — real endpoint paths and header
 * names, verified directly from the official Kotak-Neo/Kotak-neo-api-v2
 * SDK source (github.com/Kotak-Neo/Kotak-neo-api-v2 — settings.py,
 * api/login_api.py, api/totp_api.py, api/logout_api.py,
 * api/portfolio_holdings_api.py), not guessed. No unofficial SDK is used —
 * kotakNeoService.ts calls these paths directly over plain REST (axios).
 *
 * Flow (matches the SDK's own totp_login → totp_validate sequence):
 *  1. Session init:   POST {KOTAK_BASE_URL}/oauth2/token
 *                      (Basic base64(consumerKey:consumerSecret)) -> access_token.
 *                      Used only as the Bearer token on logout — Kotak's
 *                      trading calls themselves authenticate via the
 *                      Authorization/Sid/Auth headers below, not this token.
 *  2. View token:      POST {KOTAK_BASE_URL}/login/1.0/tradeApiLogin
 *                      body {mobileNumber, ucc, totp} -> data.token (view), data.sid.
 *  3. Trade token:     POST {KOTAK_BASE_URL}/login/1.0/tradeApiValidate
 *                      body {mpin} -> data.token (trade/edit), data.sid, data.rid,
 *                      data.hsServerId, data.dataCenter, data.baseUrl (per-session
 *                      trading domain — all authenticated calls after login use
 *                      THIS returned baseUrl, not KOTAK_BASE_URL).
 *  4. Logout:          POST {sessionBaseUrl}/apim/login/2.0/logout.
 *
 * There is no dedicated "profile" or "session refresh" REST endpoint in the
 * official API — profile fields (ucc/greetingName/clientType/...) come back
 * bundled in step 3's response, and there is no token-refresh call, only a
 * fresh login (see kotakNeoService.refreshSession()).
 */

export const KOTAK_NEO_BROKER_ID = 'KOTAK_NEO' as const;

/** Kotak's response does not include an explicit TTL — this is a reasonable operating assumption for a single trading session, not a value Kotak returns. */
export const KOTAK_NEO_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Default "neo-fin-key" header value the official SDK falls back to for the PROD environment when none is supplied (settings.py / neo_utility.py). */
export const KOTAK_NEO_DEFAULT_FIN_KEY = 'neotradeapi';

export const KOTAK_NEO_ENDPOINTS = {
  SESSION_INIT: '/oauth2/token',
  VIEW_TOKEN: '/login/1.0/tradeApiLogin',
  TRADE_TOKEN: '/login/1.0/tradeApiValidate',
  LOGOUT: '/apim/login/2.0/logout',
} as const;
