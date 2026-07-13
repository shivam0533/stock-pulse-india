import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { AdminApiError } from './admin.errors';
import { getPublicSettings, setSetting, APP_SETTING_KEYS } from '../services/appSettings.service';
import { hasLiveAngelOneSession, countLiveAngelOneSessions } from '../brokers/angelOne/angelOneSessionRegistry';
import type {
  AdminUserSummary, AdminDashboardStats, LoginLogEntry, AdminLogEntry, AdminNotificationEntry, NotificationType,
  AdminTradeEntry, TradeStats, AdminUserActivity,
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
  role: 'user' | 'admin' | 'super_admin'; joined_at: string;
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
    const [totalUsers, newSignupsToday, kycVerifiedUsers, adminActionsToday, todayTrades, revenue] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) FROM users'),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE joined_at >= date_trunc('day', now())`),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE kyc_status = 'verified'`),
      pool.query<{ count: string }>(`SELECT COUNT(*) FROM admin_logs WHERE created_at >= date_trunc('day', now())`),
      // Phase 2 — real (non-paper) trades only, so this reflects actual platform trading activity, not practice runs.
      pool.query<{ users_traded: string; total_trades: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS users_traded, COUNT(*)::text AS total_trades
         FROM trades WHERE is_paper = false AND exit_time >= date_trunc('day', now())`,
      ),
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount_inr), 0)::text AS total FROM payment_requests WHERE status = 'APPROVED'`,
      ),
    ]);
    const brokerConnectedUsers = countLiveAngelOneSessions();
    return {
      totalUsers: Number(totalUsers.rows[0].count),
      newSignupsToday: Number(newSignupsToday.rows[0].count),
      kycVerifiedUsers: Number(kycVerifiedUsers.rows[0].count),
      adminActionsToday: Number(adminActionsToday.rows[0].count),
      usersTradedToday: Number(todayTrades.rows[0].users_traded),
      totalTradesToday: Number(todayTrades.rows[0].total_trades),
      brokerConnectedUsers,
      brokerDisconnectedUsers: Math.max(0, Number(totalUsers.rows[0].count) - brokerConnectedUsers),
      totalRevenue: Number(revenue.rows[0].total),
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

    const items = await this.enrichWithTodayActivity(result.rows.map(toUserSummary));
    return { items, total, page, pageSize };
  }

  /**
   * Phase 2 — adds brokerConnected (live in-memory session registry, not a
   * DB column) and today's real-trade count/P&L (one aggregate query for
   * every user id on this page, not one query per row) to an already-loaded
   * page of users.
   */
  private async enrichWithTodayActivity(users: AdminUserSummary[]): Promise<AdminUserSummary[]> {
    if (users.length === 0) return users;
    const ids = users.map((u) => u.id);
    const todayAgg = await pool.query<{ user_id: string; count: string; pnl: string }>(
      `SELECT user_id, COUNT(*)::text AS count, COALESCE(SUM(pnl_amount), 0)::text AS pnl
       FROM trades
       WHERE user_id = ANY($1) AND is_paper = false AND exit_time >= date_trunc('day', now())
       GROUP BY user_id`,
      [ids],
    );
    const byUserId = new Map(todayAgg.rows.map((r) => [r.user_id, r]));
    return users.map((u) => ({
      ...u,
      brokerConnected: hasLiveAngelOneSession(u.id),
      todayTradeCount: Number(byUserId.get(u.id)?.count ?? 0),
      todayPnlAmount: Number(byUserId.get(u.id)?.pnl ?? 0),
    }));
  }

  /** Single-user detail (UserDetail.tsx's "Coming soon (Phase 2)" card) — broker status, today + overall real-trade stats, and the 10 most recent trades. */
  async getUserActivity(userId: string): Promise<AdminUserActivity> {
    const [todayAgg, overallAgg, recent] = await Promise.all([
      pool.query<{ count: string; pnl: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(pnl_amount), 0)::text AS pnl
         FROM trades WHERE user_id = $1 AND is_paper = false AND exit_time >= date_trunc('day', now())`,
        [userId],
      ),
      pool.query<{ count: string; pnl: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(pnl_amount), 0)::text AS pnl
         FROM trades WHERE user_id = $1 AND is_paper = false`,
        [userId],
      ),
      pool.query<{
        id: string; strike: string; side: 'CE' | 'PE'; expiry: string; entry_price: string; exit_price: string;
        quantity: number; investment: string; pnl_amount: string; pnl_percent: string;
        exit_kind: string; is_paper: boolean; entry_time: string; exit_time: string;
      }>(
        `SELECT id, strike, side, expiry, entry_price, exit_price, quantity, investment,
                pnl_amount, pnl_percent, exit_kind, is_paper, entry_time, exit_time
         FROM trades WHERE user_id = $1
         ORDER BY exit_time DESC LIMIT 10`,
        [userId],
      ),
    ]);

    const user = await this.getUserById(userId);
    return {
      brokerConnected: hasLiveAngelOneSession(userId),
      todayTradeCount: Number(todayAgg.rows[0]?.count ?? 0),
      todayPnlAmount: Number(todayAgg.rows[0]?.pnl ?? 0),
      overallTradeCount: Number(overallAgg.rows[0]?.count ?? 0),
      overallPnlAmount: Number(overallAgg.rows[0]?.pnl ?? 0),
      recentTrades: recent.rows.map((r) => ({
        id: r.id, userId, userName: user?.name ?? '', userEmail: user?.email ?? '',
        strike: Number(r.strike), side: r.side, expiry: r.expiry,
        entryPrice: Number(r.entry_price), exitPrice: Number(r.exit_price), quantity: r.quantity,
        investment: Number(r.investment), pnlAmount: Number(r.pnl_amount), pnlPercent: Number(r.pnl_percent),
        exitKind: r.exit_kind, isPaper: r.is_paper,
        entryTime: new Date(r.entry_time).getTime(), exitTime: new Date(r.exit_time).getTime(),
      })),
    };
  }

  async getUserById(id: string): Promise<AdminUserSummary | null> {
    const result = await pool.query<UserRow>(
      'SELECT id, name, email, phone, kyc_status, pan_verified, role, joined_at FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toUserSummary(result.rows[0]) : null;
  }

  private async countSuperAdmins(): Promise<number> {
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE role = 'super_admin'`);
    return Number(result.rows[0].count);
  }

  /**
   * SUPER_ADMIN-only "manage admins" capability. Two safeguards beyond the
   * route-level requireSuperAdmin check:
   *  - can't change your own role (no accidental self-lockout)
   *  - can't demote the last remaining super_admin (would leave nobody able
   *    to manage roles/settings at all — there is no other way back in
   *    short of a manual SQL update)
   */
  async updateUserRole(targetUserId: string, newRole: 'user' | 'admin' | 'super_admin', actingUserId: string): Promise<AdminUserSummary> {
    if (targetUserId === actingUserId) {
      throw new AdminApiError('You cannot change your own role.', 400);
    }
    const target = await this.getUserById(targetUserId);
    if (!target) {
      throw new AdminApiError('User not found.', 404);
    }
    if (target.role === 'super_admin' && newRole !== 'super_admin' && (await this.countSuperAdmins()) <= 1) {
      throw new AdminApiError('Cannot remove the last remaining super admin.', 400);
    }
    const result = await pool.query<UserRow>(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, phone, kyc_status, pan_verified, role, joined_at',
      [newRole, targetUserId],
    );
    return toUserSummary(result.rows[0]);
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

  /**
   * Phase 2 — reads the trades table every completed trade is written to
   * the instant it closes (see backend/trades/). `isPaper` lets the Admin
   * Panel filter demo/practice trades out of what's meant to represent
   * real platform activity.
   */
  async listTrades(opts: { page: number; pageSize: number; isPaper?: boolean }): Promise<Paginated<AdminTradeEntry>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const whereClause = opts.isPaper !== undefined ? 'WHERE t.is_paper = $1' : '';
    const params: unknown[] = opts.isPaper !== undefined ? [opts.isPaper] : [];

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM trades t ${whereClause}`,
      params,
    );

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await pool.query<{
      id: string; user_id: string; user_name: string; user_email: string;
      strike: string; side: 'CE' | 'PE'; expiry: string; entry_price: string; exit_price: string;
      quantity: number; investment: string; pnl_amount: string; pnl_percent: string;
      exit_kind: string; is_paper: boolean; entry_time: string; exit_time: string;
    }>(
      `SELECT t.id, t.user_id, u.name AS user_name, u.email AS user_email,
              t.strike, t.side, t.expiry, t.entry_price, t.exit_price, t.quantity,
              t.investment, t.pnl_amount, t.pnl_percent, t.exit_kind, t.is_paper,
              t.entry_time, t.exit_time
       FROM trades t JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.exit_time DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return {
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
      items: result.rows.map((r) => ({
        id: r.id, userId: r.user_id, userName: r.user_name, userEmail: r.user_email,
        strike: Number(r.strike), side: r.side, expiry: r.expiry,
        entryPrice: Number(r.entry_price), exitPrice: Number(r.exit_price), quantity: r.quantity,
        investment: Number(r.investment), pnlAmount: Number(r.pnl_amount), pnlPercent: Number(r.pnl_percent),
        exitKind: r.exit_kind, isPaper: r.is_paper,
        entryTime: new Date(r.entry_time).getTime(), exitTime: new Date(r.exit_time).getTime(),
      })),
    };
  }

  /** Real-money trades only (is_paper = false) — paper/practice activity would misrepresent actual platform performance. */
  async getTradeStats(): Promise<TradeStats> {
    const [distribution, activeUsers, symbols] = await Promise.all([
      pool.query<{ bucket: string; count: string }>(`
        SELECT bucket, COUNT(*)::text AS count FROM (
          SELECT CASE
            WHEN pnl_amount < -1000 THEN '0:< -₹1,000'
            WHEN pnl_amount < -500  THEN '1:-₹1,000 to -₹500'
            WHEN pnl_amount < 0     THEN '2:-₹500 to ₹0'
            WHEN pnl_amount < 500   THEN '3:₹0 to ₹500'
            WHEN pnl_amount < 1000  THEN '4:₹500 to ₹1,000'
            ELSE                         '5:> ₹1,000'
          END AS bucket
          FROM trades WHERE is_paper = false
        ) sub
        GROUP BY bucket ORDER BY bucket
      `),
      pool.query<{ user_id: string; user_name: string; trade_count: string }>(`
        SELECT t.user_id, u.name AS user_name, COUNT(*)::text AS trade_count
        FROM trades t JOIN users u ON u.id = t.user_id
        WHERE t.is_paper = false
        GROUP BY t.user_id, u.name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `),
      pool.query<{ strike: string; side: 'CE' | 'PE'; count: string }>(`
        SELECT strike, side, COUNT(*)::text AS count
        FROM trades WHERE is_paper = false
        GROUP BY strike, side
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `),
    ]);

    return {
      // Strips the leading "N:" sort key added only to make GROUP BY order deterministic.
      pnlDistribution: distribution.rows.map((r) => ({ bucket: r.bucket.slice(2), count: Number(r.count) })),
      mostActiveUsers: activeUsers.rows.map((r) => ({ userId: r.user_id, userName: r.user_name, tradeCount: Number(r.trade_count) })),
      mostTradedSymbols: symbols.rows.map((r) => ({ strike: Number(r.strike), side: r.side, count: Number(r.count) })),
    };
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
