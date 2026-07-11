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
}

export interface AdminDashboardStats {
  totalUsers: number;
  newSignupsToday: number;
  kycVerifiedUsers: number;
  adminActionsToday: number;
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
