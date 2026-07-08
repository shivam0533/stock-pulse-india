import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

/**
 * Shared HTTP building blocks for every Kotak Neo backend call (auth in
 * kotakNeoService.ts, trading in KotakNeoTradingService.ts) — one place for
 * retry policy and upstream error extraction so both stay consistent.
 */

/** Thrown for every Kotak Neo failure path so controllers can return the right HTTP status instead of a blanket 500. */
export class KotakNeoApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'KotakNeoApiError';
  }
}

export const KOTAK_NEO_RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 400,
} as const;

/**
 * Pulls the real upstream error message + status code out of a failed Kotak
 * Neo API call. Kotak's documented error responses (400/403/429/500/502/
 * 503/504 — verified from the official SDK docs) don't follow one single
 * fixed body shape across every endpoint, so this checks the handful of
 * shapes brokers commonly use before falling back to axios's own message.
 * A 403 from Kotak specifically means "invalid session, please re-login" —
 * mapped to our own 401 so callers/frontend treat it as "log in again",
 * not a generic permissions error.
 */
export function extractKotakError(err: unknown): KotakNeoApiError {
  if (axios.isAxiosError(err)) {
    const upstreamStatus = err.response?.status ?? 502; // no response at all -> upstream unreachable
    const status = upstreamStatus === 403 ? 401 : upstreamStatus;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const nestedErrors = data?.errors;
    const firstNestedMessage =
      Array.isArray(nestedErrors) && nestedErrors.length > 0 && typeof nestedErrors[0] === 'object'
        ? (nestedErrors[0] as Record<string, unknown>).message
        : undefined;

    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.error_description === 'string' && data.error_description) ||
      (typeof firstNestedMessage === 'string' && firstNestedMessage) ||
      (upstreamStatus === 403 && 'Invalid session, please re-login to continue.') ||
      err.message;

    return new KotakNeoApiError(
      typeof message === 'string' && message.length > 0 ? message : 'Kotak Neo API request failed.',
      status,
    );
  }
  return new KotakNeoApiError(err instanceof Error ? err.message : 'Kotak Neo API request failed.', 500);
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
export async function requestWithRetry<T>(http: AxiosInstance, config: AxiosRequestConfig): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= KOTAK_NEO_RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await http.request<T>(config);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt === KOTAK_NEO_RETRY.MAX_ATTEMPTS || !isRetryable(err)) throw err;
      await sleep(KOTAK_NEO_RETRY.BASE_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

/**
 * Kotak's form-urlencoded endpoints don't send plain form fields — the
 * official SDK's own REST client wraps the entire JSON body as a single
 * "jData" field (verified from neo_api_client/rest.py). Every POST trading
 * call below must be encoded this exact way.
 */
export function toJDataForm(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set('jData', JSON.stringify(body));
  return params.toString();
}
