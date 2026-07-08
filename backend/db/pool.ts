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
  // eslint-disable-next-line no-console
  console.log('[DB] users table ready');
}
