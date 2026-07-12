import { Pool } from 'pg';

/**
 * Single Postgres connection pool — the only persistent storage in this
 * backend. Everything else (Angel One sessions, funds, positions, option
 * chain data) is live broker data held in memory or fetched on demand; this
 * pool exists solely for real user accounts (login/signup).
 */
const connectionString = process.env.DATABASE_URL ?? '';

export const pool = new Pool({
  connectionString,
  // Render's managed Postgres requires SSL with a self-signed chain; local
  // development (no DATABASE_URL, or a plain local Postgres) needs it off.
  ssl: connectionString ? { rejectUnauthorized: false } : false,
});

/** Called once at startup — creates the users table if it doesn't exist yet. No migration framework needed for a single table. */
export async function ensureUsersTable(): Promise<void> {
  if (!connectionString) {
    // eslint-disable-next-line no-console
    console.warn('[DB] DATABASE_URL is not set — signup/login will fail until it is configured.');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      pan_verified BOOLEAN NOT NULL DEFAULT false,
      kyc_status TEXT NOT NULL DEFAULT 'pending',
      preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Added for the Admin Panel (role-gating) — a plain ALTER so this stays
  // safe to re-run on every startup, same convention as the CREATE TABLE
  // above; existing rows default to 'user'.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';`);
  // Data-integrity guard, not the security boundary (requireAdmin/
  // requireSuperAdmin check the exact role strings themselves) — still
  // worth rejecting any other value at the DB level. Unconditional
  // drop-and-recreate (not "IF NOT EXISTS, skip") since this needed
  // widening from a 2-value ('user','admin') check to 3 ('user','admin',
  // 'super_admin') for RBAC — an IF-NOT-EXISTS guard would have silently
  // kept the old, narrower constraint once it already existed.
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'));`);
  // eslint-disable-next-line no-console
  console.log('[DB] users table ready');
}

/**
 * Called once at startup, alongside ensureUsersTable() — the Admin Panel's
 * own tables. Same "CREATE TABLE IF NOT EXISTS, no migration framework"
 * convention as above, kept in one place since they're all part of the same
 * feature and small enough not to warrant separate files.
 */
export async function ensureAdminTables(): Promise<void> {
  if (!connectionString) return; // ensureUsersTable() already warned once

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id UUID PRIMARY KEY,
      admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Was NOT NULL + ON DELETE CASCADE — deleting an admin account would have
  // erased their entire audit trail, defeating the point of an audit log.
  // Safe to ALTER unconditionally: this table is brand new with zero rows
  // in every environment this has run in so far. CREATE TABLE IF NOT EXISTS
  // above is a no-op on a table that already exists (e.g. from an earlier
  // run of this same function with the old CASCADE definition), so the FK
  // itself also needs an explicit drop-and-recreate, not just the column.
  await pool.query(`ALTER TABLE admin_logs ALTER COLUMN admin_user_id DROP NOT NULL;`);
  await pool.query(`ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_user_id_fkey;`);
  await pool.query(`ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Same reasoning — deleting the admin who sent a notification shouldn't
  // retroactively delete it from every recipient's inbox.
  await pool.query(`ALTER TABLE notifications ALTER COLUMN created_by DROP NOT NULL;`);
  await pool.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_created_by_fkey;`);
  await pool.query(`ALTER TABLE notifications ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (notification_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Indexes for the query patterns admin.service.ts actually runs — every
  // list endpoint orders by created_at DESC, and a few filter by user.
  // CREATE INDEX IF NOT EXISTS (no CONCURRENTLY): these tables are new/empty
  // at every point this has run so far, so a brief write-lock during
  // creation is a non-issue; add CONCURRENTLY by hand instead if this is
  // ever run against a table with real production traffic already on it.
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs (created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs (created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_logs (admin_user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON notifications (target_user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_joined_at ON users (joined_at);`);

  // eslint-disable-next-line no-console
  console.log('[DB] admin tables ready');
}

/**
 * Called once at startup, alongside the two functions above — the
 * Subscription & Trial system's tables/columns. Same "no migration
 * framework, plain CREATE/ALTER IF NOT EXISTS" convention as the rest of
 * this file.
 */
export async function ensureSubscriptionTables(): Promise<void> {
  if (!connectionString) return;

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'ACTIVE';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;`);
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_subscription_status_check CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'));`);
  // NOTE: this table's one-time grandfather backfill (accounts that existed
  // before the subscription system launched got 30 days of free ACTIVE
  // access) has been removed. Signup no longer grants a free trial — new
  // accounts are inserted with subscription_status = 'EXPIRED' directly
  // (see auth.service.ts), which also leaves trial_start_date NULL forever.
  // A "WHERE trial_start_date IS NULL" backfill would therefore now match
  // every new unpaid signup on every server restart and silently re-grant
  // them 30 free days, defeating the entire "pay before you trade" gate.

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      utr TEXT NOT NULL,
      screenshot TEXT,
      plan_id TEXT NOT NULL DEFAULT 'MONTHLY',
      duration_days INTEGER NOT NULL DEFAULT 30,
      amount_inr NUMERIC NOT NULL DEFAULT 5999,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Added when 3-month/1-year plans landed alongside the original
  // monthly-only plan — ALTER ... IF NOT EXISTS so this stays safe to re-run
  // against a payment_requests table that already exists in production.
  await pool.query(`ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'MONTHLY';`);
  await pool.query(`ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests (created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users (subscription_status);`);

  // eslint-disable-next-line no-console
  console.log('[DB] subscription tables ready');
}
