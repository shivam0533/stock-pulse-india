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
