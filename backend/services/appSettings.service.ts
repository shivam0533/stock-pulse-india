import { pool } from '../db/pool';

/**
 * Simple key/value store backing the Admin Panel's Settings page
 * (app_settings table) — one row per setting, no dedicated table per
 * setting. Keys defined here are the only ones this app reads/writes; the
 * table itself accepts any key, but callers should stick to this list.
 */
export const APP_SETTING_KEYS = {
  MAINTENANCE_MODE: 'maintenanceMode',
  TRADING_ENABLED: 'tradingEnabled',
} as const;

export interface PublicAppSettings {
  maintenanceMode: boolean;
  tradingEnabled: boolean;
  /** Admin-configured Option Chain SL/Target % — applied once to a fresh (never-customized) browser's Risk Settings (Phase 2), never overwriting a user's own choice. */
  riskDefaults: { maxLossPercent: number; maxProfitPercent: number };
}

const DEFAULTS: PublicAppSettings = {
  maintenanceMode: false,
  tradingEnabled: true,
  riskDefaults: { maxLossPercent: 3, maxProfitPercent: 7 },
};

export async function getPublicSettings(): Promise<PublicAppSettings> {
  const result = await pool.query<{ key: string; value: unknown }>(
    'SELECT key, value FROM app_settings WHERE key = ANY($1)',
    [[APP_SETTING_KEYS.MAINTENANCE_MODE, APP_SETTING_KEYS.TRADING_ENABLED, 'riskDefaults']],
  );
  const settings = { ...DEFAULTS };
  for (const row of result.rows) {
    if (row.key === APP_SETTING_KEYS.MAINTENANCE_MODE) settings.maintenanceMode = row.value as boolean;
    if (row.key === APP_SETTING_KEYS.TRADING_ENABLED) settings.tradingEnabled = row.value as boolean;
    if (row.key === 'riskDefaults') settings.riskDefaults = row.value as { maxLossPercent: number; maxProfitPercent: number };
  }
  return settings;
}

export async function setSetting(key: string, value: unknown, updatedBy: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, now(), $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now(), updated_by = $3`,
    [key, JSON.stringify(value), updatedBy],
  );
}
