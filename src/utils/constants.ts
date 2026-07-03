export const APP_NAME = 'Stock Pulse India';
export const APP_TAGLINE = 'Markets, Live.';

export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/',
  MARKETS: '/markets',
  STOCK_DETAIL: '/stock/:symbol',
  PORTFOLIO: '/portfolio',
  WATCHLIST: '/watchlist',
  NEWS: '/news',
  PROFILE: '/profile',
  OPTION_CHAIN: '/option-chain',
  SIGNALS: '/signals',
  ALGO: '/algo',
  ANALYTICS: '/analytics',
  TRADE_HISTORY: '/trade-history',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SETTINGS: '/settings',
  NOT_FOUND: '*',
} as const;

export const QUERY_KEYS = {
  USER: ['user'],
  STOCKS: ['stocks'],
  STOCK: (symbol: string) => ['stock', symbol],
  STOCK_HISTORY: (symbol: string, timeframe: string) => ['stock-history', symbol, timeframe],
  INDICES: ['indices'],
  PORTFOLIO: ['portfolio'],
  WATCHLIST: ['watchlist'],
  NEWS: ['news'],
  TOP_MOVERS: ['top-movers'],
  ACCOUNT_SUMMARY: ['account-summary'],
  MOST_ACTIVE: ['most-active'],
  OPEN_ORDERS: ['open-orders'],
  RECENT_TRADES: ['recent-trades'],
  TRADING_SIGNALS: ['trading-signals'],
  AI_CONFIDENCE: ['ai-confidence'],
  EQUITY_CURVE: ['equity-curve'],
  PORTFOLIO_GROWTH: ['portfolio-growth'],
  DAILY_PNL: ['daily-pnl'],
  SECTOR_ALLOCATION: ['sector-allocation'],
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'sp_auth_token',
  REFRESH_TOKEN: 'sp_refresh_token',
  USER: 'sp_user',
  THEME: 'sp_theme',
  SIDEBAR_COLLAPSED: 'sp_sidebar_collapsed',
  WATCHLIST: 'sp_watchlist',
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

export const INDIAN_INDICES = [
  { symbol: 'NIFTY50', name: 'NIFTY 50' },
  { symbol: 'SENSEX', name: 'BSE SENSEX' },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY' },
  { symbol: 'NIFTYIT', name: 'NIFTY IT' },
] as const;
