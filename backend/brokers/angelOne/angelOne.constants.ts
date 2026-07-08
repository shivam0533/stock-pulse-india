/**
 * Angel One (SmartAPI) constants — endpoint paths and base URL verified
 * directly from Angel One's official JavaScript SDK source
 * (github.com/angel-one/smartapi-javascript, config/api.js), not guessed.
 */

export const ANGEL_ONE_BROKER_ID = 'ANGEL_ONE' as const;

/** SmartAPI sessions remain active until 12 midnight IST regardless of issue time (documented behavior) — this is a practical operating TTL, not a value SmartAPI itself returns. */
export const ANGEL_ONE_SESSION_TTL_SECONDS = 3600;

/** Current official domain (SmartAPI rebranded from apiconnect.angelbroking.com). */
export const ANGEL_ONE_API_BASE_URL = 'https://apiconnect.angelone.in';
export const ANGEL_ONE_MARKET_FEED_WS_URL = 'wss://smartapisocket.angelone.in/smart-stream';

export const ANGEL_ONE_ENDPOINTS = {
  LOGIN: '/rest/auth/angelbroking/user/v1/loginByPassword',
  LOGOUT: '/rest/secure/angelbroking/user/v1/logout',
  REFRESH_SESSION: '/rest/auth/angelbroking/jwt/v1/generateTokens',
  PROFILE: '/rest/secure/angelbroking/user/v1/getProfile',
  FUNDS: '/rest/secure/angelbroking/user/v1/getRMS',
  POSITIONS: '/rest/secure/angelbroking/order/v1/getPosition',
  HOLDINGS: '/rest/secure/angelbroking/portfolio/v1/getHolding',
  PLACE_ORDER: '/rest/secure/angelbroking/order/v1/placeOrder',
  MODIFY_ORDER: '/rest/secure/angelbroking/order/v1/modifyOrder',
  CANCEL_ORDER: '/rest/secure/angelbroking/order/v1/cancelOrder',
  ORDER_BOOK: '/rest/secure/angelbroking/order/v1/getOrderBook',
  TRADE_BOOK: '/rest/secure/angelbroking/order/v1/getTradeBook',
  MARKET_DATA: '/rest/secure/angelbroking/market/v1/quote',
  OPTION_GREEK: '/rest/secure/angelbroking/marketData/v1/optionGreek',
} as const;

export const ANGEL_ONE_EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'MCX', 'CDS'] as const;
export const ANGEL_ONE_PRODUCT_TYPES = ['INTRADAY', 'DELIVERY', 'MARGIN', 'CARRYFORWARD'] as const;
export const ANGEL_ONE_ORDER_TYPES = ['MARKET', 'LIMIT', 'STOPLOSS_LIMIT', 'STOPLOSS_MARKET'] as const;
export const ANGEL_ONE_ORDER_VARIETIES = ['NORMAL', 'STOPLOSS', 'AMO', 'ROBO'] as const;
