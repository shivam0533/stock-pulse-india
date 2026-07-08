/**
 * Domain types for the Kotak Neo (Kotak Securities Trade API) integration.
 * Field names on the request/response types below mirror the real API
 * exactly (see kotakNeo.constants.ts for the verified source).
 */

export interface KotakNeoLoginRequest {
  consumerKey: string;
  consumerSecret: string;
  mobileNumber: string;
  /** Unique Client Code (visible in the Kotak Neo app/website under Profile). */
  ucc: string;
  /** 6-digit code from an authenticator app (Google/Microsoft Authenticator) — NOT an SMS OTP. */
  totp: string;
  mpin: string;
}

/** Raw response body of POST /login/1.0/tradeApiLogin ("data" object). */
export interface KotakNeoViewTokenResponse {
  token: string;
  sid: string;
}

/** Raw response body of POST /login/1.0/tradeApiValidate ("data" object) — verified field list from the official SDK's own docstring. */
export interface KotakNeoTradeTokenResponse {
  token: string;
  sid: string;
  rid: string;
  hsServerId: string;
  isUserPwdExpired?: boolean;
  ucc: string;
  greetingName: string;
  isTrialAccount?: boolean;
  dataCenter: string;
  baseUrl: string;
  clientType?: string;
  isNRI?: boolean;
  status?: string;
}

/**
 * The in-memory session record. `tradeToken`/`bearerToken`/`sid`/`serverId`
 * are the genuinely sensitive/session-identifying fields — none of them are
 * ever included in any HTTP response this backend sends, and none are ever
 * logged. Nothing about the password/MPIN/TOTP/consumer secret used to
 * obtain this session is retained anywhere past the single login() call.
 */
export interface KotakNeoSession {
  clientId: string; // ucc
  userName: string; // greetingName
  tradeToken: string; // edit token — used as the `Auth` header on later calls
  sid: string; // edit sid — used as the `Sid` header on later calls
  serverId: string; // hsServerId — used as the `sId` query param on later calls
  dataCenter: string;
  /** Per-session trading domain returned by Kotak itself — NOT the fixed KOTAK_BASE_URL used for login. */
  tradeBaseUrl: string;
  /** OAuth2 client_credentials token (session_init) — only ever used as the Bearer token on logout. */
  bearerToken: string | null;
  loginTime: string; // ISO 8601
  sessionExpiresAt: string; // ISO 8601
}

/** What login()/getStatus() are allowed to hand back to the frontend — no token, sid, or serverId, ever. */
export interface KotakNeoSessionSummary {
  clientId: string;
  userName: string;
  loginTime: string;
  sessionExpiresAt: string;
  sessionStatus: 'ACTIVE';
}

export type KotakNeoStatusResult =
  | { connected: false }
  | ({ connected: true } & KotakNeoSessionSummary);

/**
 * Kotak Neo has no dedicated "get profile" REST endpoint — these fields are
 * bundled into the tradeApiValidate response itself, so getProfile() here
 * returns the cached values from login rather than making another call.
 */
export interface KotakNeoProfile {
  clientId: string;
  userName: string;
  mobileNumber: string;
}
