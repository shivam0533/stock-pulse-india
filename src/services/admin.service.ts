import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import type {
  AdminUserSummary, AdminDashboardStats, LoginLogEntry, AdminLogEntry,
  AdminNotificationEntry, AdminNotificationType, AdminSettings, UserRole,
  AdminTradeEntry, TradeStats, AdminUserActivity,
} from '@/types';

/** Server-side-paginated result shape every /api/admin/* list endpoint returns. */
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'joinedAt' | 'kycStatus' | 'role';
  sortDir?: 'asc' | 'desc';
}

export const adminService = {
  async getDashboard(): Promise<AdminDashboardStats> {
    const { data } = await apiClient.get<AdminDashboardStats>(ENDPOINTS.admin.dashboard);
    return data;
  },

  async listUsers(params: ListUsersParams = {}): Promise<AdminPage<AdminUserSummary>> {
    const { data } = await apiClient.get<AdminPage<AdminUserSummary>>(ENDPOINTS.admin.users, { params });
    return data;
  },

  async getUser(id: string): Promise<AdminUserSummary> {
    const { data } = await apiClient.get<AdminUserSummary>(ENDPOINTS.admin.user(id));
    return data;
  },

  async getUserActivity(id: string): Promise<AdminUserActivity> {
    const { data } = await apiClient.get<AdminUserActivity>(ENDPOINTS.admin.userActivity(id));
    return data;
  },

  /** SUPER_ADMIN only — server-enforced by requireSuperAdmin regardless of what the client sends. */
  async updateUserRole(id: string, role: UserRole): Promise<AdminUserSummary> {
    const { data } = await apiClient.put<AdminUserSummary>(ENDPOINTS.admin.userRole(id), { role });
    return data;
  },

  async searchSupport(q: string): Promise<AdminPage<AdminUserSummary>> {
    const { data } = await apiClient.get<AdminPage<AdminUserSummary>>(ENDPOINTS.admin.supportSearch, { params: { q } });
    return data;
  },

  async listLoginLogs(page = 1, pageSize = 20): Promise<AdminPage<LoginLogEntry>> {
    const { data } = await apiClient.get<AdminPage<LoginLogEntry>>(ENDPOINTS.admin.loginLogs, { params: { page, pageSize } });
    return data;
  },

  async listAdminLogs(page = 1, pageSize = 20): Promise<AdminPage<AdminLogEntry>> {
    const { data } = await apiClient.get<AdminPage<AdminLogEntry>>(ENDPOINTS.admin.adminLogs, { params: { page, pageSize } });
    return data;
  },

  async getSignupsPerDay(days = 30): Promise<Array<{ date: string; count: number }>> {
    const { data } = await apiClient.get<Array<{ date: string; count: number }>>(ENDPOINTS.admin.signupsPerDay, { params: { days } });
    return data;
  },

  async sendNotification(input: { title: string; message: string; type: AdminNotificationType; targetUserId?: string | null }): Promise<AdminNotificationEntry> {
    const { data } = await apiClient.post<AdminNotificationEntry>(ENDPOINTS.admin.notifications, input);
    return data;
  },

  async listNotifications(page = 1, pageSize = 20): Promise<AdminPage<AdminNotificationEntry>> {
    const { data } = await apiClient.get<AdminPage<AdminNotificationEntry>>(ENDPOINTS.admin.notifications, { params: { page, pageSize } });
    return data;
  },

  async listTrades(opts: { page?: number; pageSize?: number; isPaper?: boolean } = {}): Promise<AdminPage<AdminTradeEntry>> {
    const { data } = await apiClient.get<AdminPage<AdminTradeEntry>>(ENDPOINTS.admin.trades, { params: opts });
    return data;
  },

  async getTradeStats(): Promise<TradeStats> {
    const { data } = await apiClient.get<TradeStats>(ENDPOINTS.admin.tradeStats);
    return data;
  },

  async getSettings(): Promise<AdminSettings> {
    const { data } = await apiClient.get<AdminSettings>(ENDPOINTS.admin.settings);
    return data;
  },

  async updateSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const { data } = await apiClient.put<AdminSettings>(ENDPOINTS.admin.settings, updates);
    return data;
  },
};
