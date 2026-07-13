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
  settings: {
    public: '/settings/public',
  },
  notifications: {
    unread: '/notifications/unread',
    markRead: '/notifications/mark-read',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    userRole: (id: string) => `/admin/users/${id}/role`,
    supportSearch: '/admin/support/search',
    loginLogs: '/admin/logs/login',
    adminLogs: '/admin/logs/admin-actions',
    signupsPerDay: '/admin/analytics/signups',
    tradeStats: '/admin/analytics/trades-stats',
    trades: '/admin/trades',
    notifications: '/admin/notifications',
    settings: '/admin/settings',
  },
  trades: {
    record: '/trades',
  },
  subscription: {
    status: '/subscription/status',
    paymentRequest: '/subscription/payment-request',
  },
  adminSubscriptions: {
    paymentRequests: '/admin/subscriptions/payment-requests',
    paymentRequestDetail: (id: string) => `/admin/subscriptions/payment-requests/${id}`,
    approve: (id: string) => `/admin/subscriptions/payment-requests/${id}/approve`,
    reject: (id: string) => `/admin/subscriptions/payment-requests/${id}/reject`,
    users: '/admin/subscriptions/users',
    activate: (id: string) => `/admin/subscriptions/users/${id}/activate`,
    extend: (id: string) => `/admin/subscriptions/users/${id}/extend`,
    cancel: (id: string) => `/admin/subscriptions/users/${id}/cancel`,
  },
} as const;
