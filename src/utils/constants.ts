export const APP_NAME = 'Stock Pulse India';
export const APP_TAGLINE = 'Markets, Live.';

export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/',
  STOCK_DETAIL: '/stock/:symbol',
  PROFILE: '/profile',
  OPTION_CHAIN: '/option-chain',
  POSITIONS: '/positions',
  TRADE_HISTORY: '/trade-history',
  PERFORMANCE: '/performance',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SETTINGS: '/settings',
  BROKER_INTEGRATION: '/broker-integration',
  KOTAK_NEO_INTEGRATION: '/broker/kotak-neo',
  NOT_FOUND: '*',
} as const;

export const QUERY_KEYS = {
  USER: ['user'],
  STOCK: (symbol: string) => ['stock', symbol],
  STOCK_HISTORY: (symbol: string, timeframe: string) => ['stock-history', symbol, timeframe],
  PORTFOLIO: ['portfolio'],
  ACCOUNT_SUMMARY: ['account-summary'],
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'sp_auth_token',
  REFRESH_TOKEN: 'sp_refresh_token',
  USER: 'sp_user',
  THEME: 'sp_theme',
  SIDEBAR_COLLAPSED: 'sp_sidebar_collapsed',
  NOTIFICATIONS: 'sp_notifications',
} as const;

export const API_TIMEOUTS = {
  DEFAULT: 15000,
  UPLOAD: 60000,
} as const;

export const MARKET_HOURS = {
  // NSE/BSE hours in IST
  OPEN_HOUR: 9,
  OPEN_MINUTE: 15,
  CLOSE_HOUR: 15,
  CLOSE_MINUTE: 30,
} as const;

export const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const;
