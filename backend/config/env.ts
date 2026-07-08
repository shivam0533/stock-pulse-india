import path from 'path';
import { config as loadDotenv } from 'dotenv';

// Explicit path (not the bare 'dotenv/config' side-effect import) so we can
// print exactly which file was targeted and whether dotenv actually found
// and parsed it — no ambiguity about which .env is in play.
const resolvedEnvPath = path.resolve(process.cwd(), '.env');
const dotenvResult = loadDotenv({ path: resolvedEnvPath });

// eslint-disable-next-line no-console
console.log('[Config] process.cwd():', process.cwd());
// eslint-disable-next-line no-console
console.log('[Config] Resolved .env path:', resolvedEnvPath);
// eslint-disable-next-line no-console
console.log('[Config] .env file found and parsed by dotenv:', !dotenvResult.error, dotenvResult.error ? `(${dotenvResult.error.message})` : '');
// eslint-disable-next-line no-console
console.log('[Config] Keys parsed from that file:', dotenvResult.parsed ? Object.keys(dotenvResult.parsed) : []);
// eslint-disable-next-line no-console
console.log('[Config] NODE_ENV:', process.env.NODE_ENV ?? '(not set)');

/**
 * Single place that reads process.env — nothing else in the backend should
 * reference process.env.KOTAK_* directly. Values are read once at module
 * load; if any are missing, kotakNeoService surfaces a clear config error
 * on first use rather than the whole server refusing to start (other
 * brokers must keep working even if Kotak Neo isn't configured yet).
 */
export const kotakNeoConfig = {
  consumerKey: process.env.KOTAK_CONSUMER_KEY ?? '',
  consumerSecret: process.env.KOTAK_CONSUMER_SECRET ?? '',
  baseUrl: process.env.KOTAK_BASE_URL ?? '',
};

export function isKotakNeoConfigured(): boolean {
  return !!(kotakNeoConfig.consumerKey && kotakNeoConfig.consumerSecret && kotakNeoConfig.baseUrl);
}

/**
 * Angel One SmartAPI needs a single registered API Key (no secret exchange
 * step, unlike Kotak Neo) — generated from the SmartAPI developer portal.
 */
export const angelOneConfig = {
  apiKey: process.env.ANGEL_ONE_API_KEY ?? '',
};

export function isAngelOneConfigured(): boolean {
  return !!angelOneConfig.apiKey;
}

function maskKey(key: string): string {
  if (!key) return '(empty)';
  if (key.length <= 4) return '*'.repeat(key.length);
  return '*'.repeat(key.length - 4) + key.slice(-4);
}

// eslint-disable-next-line no-console
console.log('[Config] process.env.ANGEL_ONE_API_KEY (masked):', maskKey(process.env.ANGEL_ONE_API_KEY ?? ''));
// eslint-disable-next-line no-console
console.log('Angel One API Key Loaded:', !!process.env.ANGEL_ONE_API_KEY);
// eslint-disable-next-line no-console
console.log('isAngelOneConfigured():', isAngelOneConfigured());

if (!isAngelOneConfigured()) {
  // Startup warning only — never throws/crashes the server. Angel One
  // endpoints stay reachable and return a clean 500 (see angelOne.service.ts
  // login()) instead of the whole backend refusing to boot, so other
  // brokers (Kotak Neo, etc.) keep working even without this key set.
  // eslint-disable-next-line no-console
  console.error(
    '[Config] ANGEL_ONE_API_KEY is not set — Angel One login/trading requests will fail ' +
    'with "Angel One API is not configured on the server" until it is set in backend/.env ' +
    '(local) or your deployment platform\'s environment variables (production), then the ' +
    'server is restarted/redeployed.',
  );
}
