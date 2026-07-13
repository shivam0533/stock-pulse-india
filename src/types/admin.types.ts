import type { UserRole } from './auth.types';

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  panVerified: boolean;
  role: UserRole;
  joinedAt: number;
  /** Only populated by listUsers() (server-enriched per page) — absent from getUser()/searchSupport(). */
  brokerConnected?: boolean;
  todayTradeCount?: number;
  todayPnlAmount?: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  newSignupsToday: number;
  kycVerifiedUsers: number;
  adminActionsToday: number;
  usersTradedToday: number;
  totalTradesToday: number;
  brokerConnectedUsers: number;
  brokerDisconnectedUsers: number;
  totalRevenue: number;
}

export interface AdminUserActivity {
  brokerConnected: boolean;
  todayTradeCount: number;
  todayPnlAmount: number;
  overallTradeCount: number;
  overallPnlAmount: number;
  recentTrades: AdminTradeEntry[];
}

export interface LoginLogEntry {
  id: string;
  userId: string | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: number;
}

export interface AdminLogEntry {
  id: string;
  adminUserId: string | null;
  adminName: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface AdminTradeEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  strike: number;
  side: 'CE' | 'PE';
  expiry: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  investment: number;
  pnlAmount: number;
  pnlPercent: number;
  exitKind: string;
  isPaper: boolean;
  entryTime: number;
  exitTime: number;
}

export interface TradeStats {
  pnlDistribution: Array<{ bucket: string; count: number }>;
  mostActiveUsers: Array<{ userId: string; userName: string; tradeCount: number }>;
  mostTradedSymbols: Array<{ strike: number; side: 'CE' | 'PE'; count: number }>;
}

export type AdminNotificationType = 'system' | 'maintenance' | 'market-alert' | 'popup';

export interface AdminNotificationEntry {
  id: string;
  title: string;
  message: string;
  type: AdminNotificationType;
  targetUserId: string | null;
  createdBy: string | null;
  createdAt: number;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  tradingEnabled: boolean;
  riskDefaults: { maxLossPercent: number; maxProfitPercent: number };
  notificationDefaults: { marketAlerts: boolean; maintenanceAlerts: boolean };
}
