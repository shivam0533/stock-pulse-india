import { brokerApiClient, toBrokerApiError } from '@api/brokerApiClient';

/**
 * Real Kotak Neo auth/session client — calls the backend's actual
 * kotakNeoService (backend/services/kotakNeoService.ts) over
 * POST/GET /api/broker/kotak/*. No mock/local data of any kind; every
 * function here makes a real HTTP request and surfaces the backend's exact
 * error message on failure. The backend never returns the raw session
 * token to this client — only non-sensitive session metadata (Client ID,
 * User Name, Login Time, Session Status).
 */

export interface KotakNeoCredentials {
  consumerKey: string;
  consumerSecret: string;
  mobileNumber: string;
  /** Unique Client Code (visible in the Kotak Neo app/website under Profile). */
  ucc: string;
  /** 6-digit code from an authenticator app (Google/Microsoft Authenticator) — not an SMS OTP. */
  totp: string;
  mpin: string;
}

export interface KotakNeoSession {
  clientId: string;
  userName: string;
  loginTime: number; // epoch ms
  sessionExpiresAt: number; // epoch ms
}

interface KotakNeoSessionSummaryResponse {
  clientId: string;
  userName: string;
  loginTime: string; // ISO 8601
  sessionExpiresAt: string; // ISO 8601
  sessionStatus: 'ACTIVE';
}

type KotakNeoStatusResponse =
  | { connected: false }
  | ({ connected: true } & KotakNeoSessionSummaryResponse);

export async function connectKotakNeo(credentials: KotakNeoCredentials): Promise<KotakNeoSession> {
  try {
    const { data } = await brokerApiClient.post<{ success: true; data: KotakNeoSessionSummaryResponse }>(
      '/broker/kotak/login',
      credentials,
    );
    const session = data.data;
    return {
      clientId: session.clientId,
      userName: session.userName,
      loginTime: Date.parse(session.loginTime) || Date.now(),
      sessionExpiresAt: Date.parse(session.sessionExpiresAt) || Date.now(),
    };
  } catch (err) {
    throw new Error(toBrokerApiError(err).message);
  }
}

export async function disconnectKotakNeo(): Promise<void> {
  try {
    await brokerApiClient.post('/broker/kotak/logout');
  } catch (err) {
    throw new Error(toBrokerApiError(err).message);
  }
}

/** "Test Connection" — checks the backend's current Kotak Neo session status. */
export async function testKotakNeoConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await brokerApiClient.get<{ success: true; data: KotakNeoStatusResponse }>(
      '/broker/kotak/status',
    );
    return data.data.connected
      ? { success: true, message: `Kotak Neo session is active (Client ID ${data.data.clientId}).` }
      : { success: false, message: 'Not connected to Kotak Neo.' };
  } catch (err) {
    return { success: false, message: toBrokerApiError(err).message };
  }
}

/**
 * Kotak Neo's official API has no session-refresh endpoint (verified from
 * the official SDK source — sessions are only ever established via a fresh
 * login). This reads the current session status as a lightweight,
 * non-destructive stand-in rather than calling a refresh endpoint that
 * doesn't exist; a fresh login() is the only real way to extend a session.
 */
export async function refreshKotakNeoSession(): Promise<{ sessionExpiresAt: number }> {
  try {
    const { data } = await brokerApiClient.get<{ success: true; data: KotakNeoStatusResponse }>(
      '/broker/kotak/status',
    );
    return {
      sessionExpiresAt: data.data.connected ? Date.parse(data.data.sessionExpiresAt) || Date.now() : Date.now(),
    };
  } catch (err) {
    throw new Error(toBrokerApiError(err).message);
  }
}
