import type { AppUserRole } from '../auth/auth.types';

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  panVerified: boolean;
  role: AppUserRole;
  joinedAt: number;
  /** Phase 2 — only populated by listUsers() (a live in-memory + trades-table join for the current page); absent from getUserById()/searchSupport(). */
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
  /** Sum of every APPROVED payment_request — real money actually received, not the theoretical plan price. */
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

export type NotificationType = 'system' | 'maintenance' | 'market-alert' | 'popup';

export interface AdminNotificationEntry {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetUserId: string | null;
  createdBy: string | null;
  createdAt: number;
}
