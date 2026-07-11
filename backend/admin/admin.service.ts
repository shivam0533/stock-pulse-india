import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { getPublicSettings, setSetting, APP_SETTING_KEYS } from '../services/appSettings.service';
import type {
  AdminUserSummary, AdminDashboardStats, LoginLogEntry, AdminLogEntry, AdminNotificationEntry, NotificationType,
} from './admin.types';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const USER_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  email: 'email',
  joinedAt: 'joined_at',
  kycStatus: 'kyc_status',
  role: 'role',
};

interface UserRow {
  id: string; name: string; email: string; phone: string | null;
  kyc_status: 'pending' | 'verified' | 'rejected'; pan_verified: boolean;
  role: 'user' | 'admin'; joined_at: string;
}

function toUserSummary(row: UserRow): AdminUserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    kycStatus: row.kyc_status,
    panVerified: row.pan_verified,
    role: row.role,
    joinedAt: new Date(row.joined_at).getTime(),
  };
}

class AdminService {
  /** Every admin write records here — the audit trail the security requirements call for. */
  async logAction(adminUserId: string, action: string, target?: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await pool.query(
      `INSERT INTO admin_logs (id, admin_user_id, action, target, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), adminUserId, action, target ?? null, JSON.stringify(metadata)],
    );
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [totalUsers, newSignupsToday, kycVerifiedUsers, adminActionsToday] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) FROM users'),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE joined_at >= date_trunc('day', now())`),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE kyc_status = 'verified'`),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM admin_logs WHERE created_at >= date_trunc('day', now())`),
    ]);
    return {
      totalUsers: Number(totalUsers.rows[0].count),
      newSignupsToday: Number(newSignupsToday.rows[0].count),
      kycVerifiedUsers: Number(kycVerifiedUsers.rows[0].count),
      adminActionsToday: Number(adminActionsToday.rows[0].count),
    };
  }

  async listUsers(opts: { page: number; pageSize: number; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' }): Promise<Paginated<AdminUserSummary>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const sortColumn = USER_SORT_COLUMNS[opts.sortBy ?? 'joinedAt'] ?? 'joined_at';
    const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC';
    const search = opts.search?.trim();

    const whereClause = search ? 'WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1' : '';
    const params: unknown[] = search ? [`%${search}%`] : [];

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await pool.query<UserRow>(
      `SELECT id, name, email, phone, kyc_status, pan_verified, role, joined_at
       FROM users ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return { items: result.rows.map(toUserSummary), total, page, pageSize };
  }

  async getUserById(id: string): Promise<AdminUserSummary | null> {
    const result = await pool.query<UserRow>(
      'SELECT id, name, email, phone, kyc_status, pan_verified, role, joined_at FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toUserSummary(result.rows[0]) : null;
  }

  async listLoginLogs(opts: { page: number; pageSize: number }): Promise<Paginated<LoginLogEntry>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const [countResult, dataResult] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) FROM login_logs'),
      pool.query<{
        id: string; user_id: string | null; email: string; ip_address: string | null;
        user_agent: string | null; success: boolean; created_at: string;
      }>(
        'SELECT * FROM login_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
      items: dataResult.rows.map((r) => ({
        id: r.id, userId: r.user_id, email: r.email, ipAddress: r.ip_address,
        userAgent: r.user_agent, success: r.success, createdAt: new Date(r.created_at).getTime(),
      })),
    };
  }

  async listAdminLogs(opts: { page: number; pageSize: number }): Promise<Paginated<AdminLogEntry>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const [countResult, dataResult] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) FROM admin_logs'),
      pool.query<{
        id: string; admin_user_id: string | null; admin_name: string | null; action: string;
        target: string | null; metadata: Record<string, unknown>; created_at: string;
      }>(
        // LEFT JOIN (not JOIN) — admin_user_id is nullable (see pool.ts:
        // deleting an admin account no longer cascades away their audit
        // trail), so a log row can outlive the admin who created it.
        `SELECT al.id, al.admin_user_id, u.name AS admin_name, al.action, al.target, al.metadata, al.created_at
         FROM admin_logs al LEFT JOIN users u ON u.id = al.admin_user_id
         ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
      items: dataResult.rows.map((r) => ({
        id: r.id, adminUserId: r.admin_user_id, adminName: r.admin_name ?? 'Deleted admin', action: r.action,
        target: r.target, metadata: r.metadata, createdAt: new Date(r.created_at).getTime(),
      })),
    };
  }

  async createNotification(input: { title: string; message: string; type: NotificationType; targetUserId: string | null; createdBy: string }): Promise<AdminNotificationEntry> {
    const id = randomUUID();
    const result = await pool.query<{
      id: string; title: string; message: string; type: NotificationType;
      target_user_id: string | null; created_by: string; created_at: string;
    }>(
      `INSERT INTO notifications (id, title, message, type, target_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, input.title, input.message, input.type, input.targetUserId, input.createdBy],
    );
    const row = result.rows[0];
    return {
      id: row.id, title: row.title, message: row.message, type: row.type,
      targetUserId: row.target_user_id, createdBy: row.created_by, createdAt: new Date(row.created_at).getTime(),
    };
  }

  async listNotifications(opts: { page: number; pageSize: number }): Promise<Paginated<AdminNotificationEntry>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const [countResult, dataResult] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) FROM notifications'),
      pool.query<{
        id: string; title: string; message: string; type: NotificationType;
        target_user_id: string | null; created_by: string | null; created_at: string;
      }>(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
      items: dataResult.rows.map((row) => ({
        id: row.id, title: row.title, message: row.message, type: row.type,
        targetUserId: row.target_user_id, createdBy: row.created_by, createdAt: new Date(row.created_at).getTime(),
      })),
    };
  }

  /** New notifications a given user hasn't seen yet — polled by the main app's frontend. */
  async listUnreadNotificationsForUser(userId: string): Promise<AdminNotificationEntry[]> {
    const result = await pool.query<{
      id: string; title: string; message: string; type: NotificationType;
      target_user_id: string | null; created_by: string | null; created_at: string;
    }>(
      `SELECT n.* FROM notifications n
       LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = $1
       WHERE r.notification_id IS NULL AND (n.target_user_id IS NULL OR n.target_user_id = $1)
       ORDER BY n.created_at ASC LIMIT 50`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id, title: row.title, message: row.message, type: row.type,
      targetUserId: row.target_user_id, createdBy: row.created_by, createdAt: new Date(row.created_at).getTime(),
    }));
  }

  async markNotificationsRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       SELECT unnest($1::uuid[]), $2
       ON CONFLICT DO NOTHING`,
      [notificationIds, userId],
    );
  }

  /** Daily new-signup counts for the last N days — the one Analytics chart Phase 1 can honestly populate (needs no trades table). */
  async getSignupsPerDay(days = 30): Promise<Array<{ date: string; count: number }>> {
    const result = await pool.query<{ date: string; count: string }>(
      `SELECT to_char(date_trunc('day', d), 'YYYY-MM-DD') AS date, COUNT(u.id)::text AS count
       FROM generate_series(now() - ($1 || ' days')::interval, now(), '1 day') d
       LEFT JOIN users u ON date_trunc('day', u.joined_at) = date_trunc('day', d)
       GROUP BY date_trunc('day', d)
       ORDER BY date_trunc('day', d)`,
      [days],
    );
    return result.rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  async getSettings() {
    const [{ maintenanceMode, tradingEnabled }, riskDefaults, notificationDefaults] = await Promise.all([
      getPublicSettings(),
      pool.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key = $1', ['riskDefaults']),
      pool.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key = $1', ['notificationDefaults']),
    ]);
    return {
      maintenanceMode,
      tradingEnabled,
      riskDefaults: riskDefaults.rows[0]?.value ?? { maxLossPercent: 3, maxProfitPercent: 7 },
      notificationDefaults: notificationDefaults.rows[0]?.value ?? { marketAlerts: true, maintenanceAlerts: true },
    };
  }

  async updateSettings(updates: Record<string, unknown>, updatedBy: string): Promise<void> {
    // Each allowed key also declares the shape it must have — silently
    // dropping a malformed value is safer than persisting corrupt settings
    // (e.g. `tradingEnabled: "false"` — a truthy string — would otherwise
    // leave trading silently enabled after an admin thought they disabled it).
    const validators: Record<string, (v: unknown) => boolean> = {
      [APP_SETTING_KEYS.MAINTENANCE_MODE]: (v) => typeof v === 'boolean',
      [APP_SETTING_KEYS.TRADING_ENABLED]: (v) => typeof v === 'boolean',
      riskDefaults: (v) => !!v && typeof v === 'object'
        && typeof (v as { maxLossPercent?: unknown }).maxLossPercent === 'number'
        && typeof (v as { maxProfitPercent?: unknown }).maxProfitPercent === 'number',
      notificationDefaults: (v) => !!v && typeof v === 'object'
        && typeof (v as { marketAlerts?: unknown }).marketAlerts === 'boolean'
        && typeof (v as { maintenanceAlerts?: unknown }).maintenanceAlerts === 'boolean',
    };
    for (const [key, value] of Object.entries(updates)) {
      const validate = validators[key];
      if (!validate || !validate(value)) continue;
      await setSetting(key, value, updatedBy);
    }
  }
}

export const adminService = new AdminService();
