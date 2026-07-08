/**
 * Kotak Neo trading endpoint paths — verified directly from the official
 * Kotak-Neo/Kotak-neo-api-v2 SDK source (settings.py's PROD_URL dict) and
 * cross-checked against the official docs (docs/Place_Order.md,
 * Modify_Order.md, Cancel_Order.md, Order_report.md, Trade_report.md,
 * Positions.md, Holdings.md, Limits.md). All calls below use the
 * per-session `tradeBaseUrl` returned by login (kotakNeoService), never
 * KOTAK_BASE_URL — that fixed URL is only for the login exchange itself.
 */
export const KOTAK_NEO_TRADING_ENDPOINTS = {
  PLACE_ORDER: '/quick/order/rule/ms/place',
  MODIFY_ORDER: '/quick/order/vr/modify',
  CANCEL_ORDER: '/quick/order/cancel',
  ORDER_BOOK: '/quick/user/orders',
  TRADE_BOOK: '/quick/user/trades',
  POSITIONS: '/quick/user/positions',
  HOLDINGS: '/portfolio/v1/holdings',
  LIMITS: '/quick/user/limits',
} as const;

/** Real order source tag the official SDK sends on every order-related call (settings.py's ORDER_SOURCE). */
export const KOTAK_NEO_ORDER_SOURCE = 'NEOTRADEAPI';
