import os from 'os';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { angelOneConfig } from '../../config/env';

/**
 * Shared HTTP building blocks for the real Angel One SmartAPI integration —
 * verified directly from Angel One's own official JavaScript SDK source
 * (github.com/angel-one/smartapi-javascript, lib/smartapi-connect.js) and
 * config/api.js, not guessed.
 */

/** Thrown for every SmartAPI failure path so controllers can return the right HTTP status instead of a blanket 500. */
export class AngelOneApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AngelOneApiError';
  }
}

export const ANGEL_ONE_RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 400,
} as const;

/** SmartAPI's own well-known error code for "session/token invalid — log in again" (verified from the official SDK's session_expiry_hook check). */
const SESSION_EXPIRED_ERROR_CODE = 'AG8001';

/**
 * SmartAPI's envelope. The core trading/business-logic layer uses
 * { status, message, errorcode, data } (lowercase `status`/`errorcode`) —
 * this is what the official SDK's response interceptor checks
 * (`response.data.success || response.data.status`). But some failures are
 * rejected at a gateway layer *before* reaching that logic (e.g. an invalid/
 * unentitled API key) and come back as { success, message, errorCode, data }
 * instead — camelCase `errorCode`, `success` instead of `status`, and `data`
 * as an empty string `""` rather than absent. Verified directly from a real
 * getRMS rejection this session: `{"success":false,"message":"Invalid API
 * Key","errorCode":"AG8004","data":""}`. Both shapes must be checked, or a
 * gateway-level failure silently falls through as an empty/zeroed success.
 */
interface AngelOneEnvelope<T> {
  status?: boolean;
  success?: boolean;
  message?: string;
  errorcode?: string;
  errorCode?: string;
  data?: T;
}

/**
 * Every SmartAPI response is HTTP 200 even on failure — success/failure is
 * signaled by the `status`/`success` field in the body. This unwraps that
 * envelope, throwing an AngelOneApiError with the real message whenever
 * either failure flag is false, mapping the documented session-expiry error
 * code to 401 so callers treat it as "log in again", not a generic failure.
 * Also rejects a non-object `data` (missing, null, or the empty string some
 * gateway failures return) instead of silently defaulting to `{}` — a
 * silent empty object is exactly what let a real "Invalid API Key" failure
 * render as ₹0 balances instead of a visible error.
 */
export function unwrapAngelOneEnvelope<T>(body: AngelOneEnvelope<T>): T {
  if (body.status === false || body.success === false) {
    const errorCode = body.errorcode ?? body.errorCode;
    const statusCode = errorCode === SESSION_EXPIRED_ERROR_CODE ? 401 : 400;
    throw new AngelOneApiError(body.message || 'SmartAPI request failed.', statusCode);
  }
  if (body.data === undefined || body.data === null || typeof body.data !== 'object') {
    throw new AngelOneApiError(body.message || 'SmartAPI returned no usable data for this request.', 502);
  }
  return body.data;
}

function extractHttpError(err: unknown): AngelOneApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502; // no response at all -> upstream unreachable
    const data = err.response?.data as AngelOneEnvelope<unknown> | undefined;
    const message = data?.message || err.message || 'SmartAPI request failed.';
    const mappedStatus = data?.errorcode === SESSION_EXPIRED_ERROR_CODE ? 401 : status;
    return new AngelOneApiError(message, mappedStatus);
  }
  return new AngelOneApiError(err instanceof Error ? err.message : 'SmartAPI request failed.', 500);
}

export function toAngelOneApiError(err: unknown): AngelOneApiError {
  return err instanceof AngelOneApiError ? err : extractHttpError(err);
}

function isRetryable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (!err.response) return true; // network error / timeout — worth retrying
  return err.response.status === 429 || err.response.status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs one request with retry-on-transient-failure (429/5xx/network) — never retries 4xx credential/validation/session errors. */
export async function requestWithRetry<T>(http: AxiosInstance, config: AxiosRequestConfig): Promise<AngelOneEnvelope<T>> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= ANGEL_ONE_RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await http.request<AngelOneEnvelope<T>>(config);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt === ANGEL_ONE_RETRY.MAX_ATTEMPTS || !isRetryable(err)) throw extractHttpError(err);
      await sleep(ANGEL_ONE_RETRY.BASE_DELAY_MS * attempt);
    }
  }
  throw extractHttpError(lastErr);
}

/** Local IP + MAC address of this server's first non-internal network interface (Node's built-in `os` module — no extra dependency). */
function getLocalNetworkInfo(): { ip: string; mac: string } {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (!entry.internal && entry.family === 'IPv4') {
        return { ip: entry.address, mac: entry.mac };
      }
    }
  }
  return { ip: '127.0.0.1', mac: '00:00:00:00:00:00' };
}

let cachedPublicIp: string | null = null;

/** Best-effort public IP lookup (a well-known, free IP-echo service) — falls back to the local IP if unreachable, so a login attempt never fails purely because this lookup did. */
async function getPublicIp(): Promise<string> {
  if (cachedPublicIp) return cachedPublicIp;
  try {
    const { data } = await axios.get<{ ip: string }>('https://api.ipify.org?format=json', { timeout: 3000 });
    cachedPublicIp = data.ip;
    return cachedPublicIp;
  } catch {
    return getLocalNetworkInfo().ip;
  }
}

/**
 * SmartAPI requires these three headers on every request (verified from the
 * official SDK — set once per axios instance there; built per-call here
 * since the public IP lookup is async).
 */
export async function getClientNetworkHeaders(): Promise<Record<string, string>> {
  const { ip: localIp, mac } = getLocalNetworkInfo();
  const publicIp = await getPublicIp();
  return {
    'X-ClientLocalIP': localIp,
    'X-ClientPublicIP': publicIp,
    'X-MACAddress': mac,
  };
}

/** The 3 headers every SmartAPI call needs beyond the network ones above (verified from the official SDK's request_util). */
export function authHeaders(accessToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': angelOneConfig.apiKey,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}
