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
    detail: (symbol: string) => `/stocks/${symbol}`,
    history: (symbol: string) => `/stocks/${symbol}/history`,
    search: '/stocks/search',
  },
  portfolio: {
    summary: '/portfolio',
    holdings: '/portfolio/holdings',
    transactions: '/portfolio/transactions',
  },
  user: {
    profile: '/user/profile',
    preferences: '/user/preferences',
  },
  dashboard: {
    accountSummary: '/dashboard/account-summary',
  },
} as const;
