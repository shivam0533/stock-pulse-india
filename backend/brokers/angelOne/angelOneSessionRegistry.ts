import { AngelOneService } from './angelOne.service';

/**
 * Per-user Angel One sessions — an in-memory Map keyed by this app's own
 * user id (from requireAuth's JWT), not a single global session. Fixes the
 * previous architecture where `angelOneService` was one bare singleton for
 * the entire process: two different people connecting their own Angel One
 * accounts would silently overwrite each other's session, and every
 * request — regardless of who made it — read/wrote the same one session.
 *
 * Deliberately just a Map, not Redis/a DB table: sessions are lost on a
 * server restart, exactly like the old singleton was, just now scoped per
 * user instead of losing everyone at once. That's an acceptable tradeoff
 * at this app's target scale (30-50 concurrent users, single Railway
 * process) — not something to fix by introducing external infra.
 */
const sessions = new Map<string, AngelOneService>();

/** Returns this user's AngelOneService instance, creating one (with no session yet) the first time they're seen. */
export function getOrCreateAngelOneSession(userId: string): AngelOneService {
  let service = sessions.get(userId);
  if (!service) {
    service = new AngelOneService();
    sessions.set(userId, service);
  }
  return service;
}

/**
 * Returns any one currently-live session — used only by the shared
 * market-data WebSocket/REST fallback (angelOneWebSocket.service.ts,
 * angelOneMarketData.service.ts), which need *a* valid feed token to
 * authenticate the one shared upstream connection, not a specific user's:
 * NIFTY/option LTP is the same public exchange data no matter whose Angel
 * One account opens the socket, so one shared connection (not one per
 * user) is correct here, not a shortcut.
 */
export function getAnyLiveAngelOneSession(): AngelOneService | null {
  for (const service of sessions.values()) {
    if (service.hasSession()) return service;
  }
  return null;
}

/** Read-only broker-connected check for the Admin Panel (Users list/detail, Dashboard) — never creates a session, unlike getOrCreateAngelOneSession(). */
export function hasLiveAngelOneSession(userId: string): boolean {
  return sessions.get(userId)?.hasSession() ?? false;
}

/** Count of users with a currently-live Angel One session — Admin Dashboard's "Broker Connected Users" stat. */
export function countLiveAngelOneSessions(): number {
  let count = 0;
  for (const service of sessions.values()) {
    if (service.hasSession()) count += 1;
  }
  return count;
}
