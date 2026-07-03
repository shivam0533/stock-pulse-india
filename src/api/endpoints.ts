export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
  },
  stocks: {
    list: '/stocks',
    detail: (symbol: string) => `/stocks/${symbol}`,
    history: (symbol: string) => `/stocks/${symbol}/history`,
    search: '/stocks/search',
    topMovers: '/stocks/top-movers',
  },
  indices: {
    list: '/indices',
    detail: (symbol: string) => `/indices/${symbol}`,
  },
  portfolio: {
    summary: '/portfolio',
    holdings: '/portfolio/holdings',
    transactions: '/portfolio/transactions',
  },
  watchlist: {
    list: '/watchlist',
    add: '/watchlist/add',
    remove: (symbol: string) => `/watchlist/${symbol}`,
  },
  news: {
    feed: '/news',
    byTicker: (symbol: string) => `/news/ticker/${symbol}`,
  },
  user: {
    profile: '/user/profile',
    preferences: '/user/preferences',
  },
  dashboard: {
    accountSummary: '/dashboard/account-summary',
    mostActive: '/dashboard/most-active',
    openOrders: '/orders/open',
    trades: '/trades/recent',
    signals: '/ai/signals',
    aiConfidence: '/ai/confidence',
    equityCurve: '/dashboard/equity-curve',
    portfolioGrowth: '/dashboard/portfolio-growth',
    dailyPnl: '/dashboard/daily-pnl',
    sectorAllocation: '/portfolio/sector-allocation',
  },
} as const;
