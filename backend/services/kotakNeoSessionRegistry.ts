import { KotakNeoService } from './kotakNeoService';

/**
 * Per-user Kotak Neo sessions — mirrors angelOneSessionRegistry.ts's fix for
 * the identical bug: `kotakNeoService` was a bare module-level singleton
 * with one `currentSession` field for the entire process. Any authenticated
 * user calling /api/orders/place, /positions, /funds, etc. (kotakNeoTrading
 * routes, mounted at bare /api) executed against whichever Kotak Neo
 * account most recently logged in — real cross-user access to trading
 * actions and account data. Keyed by this app's own user id (from
 * requireAuth's JWT), never a shared/global instance.
 */
const sessions = new Map<string, KotakNeoService>();

/** Returns this user's KotakNeoService instance, creating one (with no session yet) the first time they're seen. */
export function getOrCreateKotakNeoSession(userId: string): KotakNeoService {
  let service = sessions.get(userId);
  if (!service) {
    service = new KotakNeoService();
    sessions.set(userId, service);
  }
  return service;
}
