import { useEffect } from 'react';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerToastStore } from '@store/brokerToast.store';
import { brokerApiClient } from '@api/brokerApiClient';
import type { BrokerId } from '@services/broker/broker.types';

const CHECK_INTERVAL_MS = 5000;
// Refresh once less than this much time remains on the session, instead of
// waiting for it to actually lapse.
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000;
// Minimum gap between refresh attempts for the same broker. Without this, a
// refresh that keeps failing (backend down, session genuinely dead) gets
// retried on every 5s tick for the full 10-minute window — ~120 duplicate
// POSTs hammering the backend for one already-known-bad session.
const RETRY_COOLDOWN_MS = 30 * 1000;

interface RefreshSessionResponseData {
  clientCode: string;
  name: string;
  broker: string;
  loginTime: string;
  expiresIn: number;
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

/**
 * Watches every connected broker session's `sessionExpiresAt`. Previously
 * this only ever watched the clock and force-disconnected the UI the
 * instant login+1h passed — even mid-trading-session, even though the
 * backend's own POST /broker/:brokerId/refresh-session already existed and
 * can keep the real Angel One session alive all day. The frontend just
 * never called it, so "Connected" died every hour on schedule regardless of
 * whether the user was actively trading (reported: disconnected twice
 * between 11am-3pm). Now it proactively refreshes in the background once a
 * session is within REFRESH_BEFORE_EXPIRY_MS of expiring, extending
 * sessionExpiresAt — the hard expiry-and-disconnect below only fires if
 * that refresh itself fails (e.g. the session is genuinely dead).
 */
export function useBrokerSessionMonitor() {
  useEffect(() => {
    const refreshing = new Set<BrokerId>();
    const lastAttemptAt = new Map<BrokerId, number>();

    const checkExpiry = () => {
      const { connections, setDisconnected, setConnected } = useBrokerConnectionStore.getState();
      const now = Date.now();
      for (const [key, info] of Object.entries(connections)) {
        const brokerId = key as BrokerId;
        if (!info) continue;

        if (now >= info.sessionExpiresAt) {
          setDisconnected(brokerId);
          useBrokerToastStore.getState().push('error', `${info.brokerName} session expired. Please reconnect.`);
          continue;
        }

        if (
          info.sessionExpiresAt - now <= REFRESH_BEFORE_EXPIRY_MS &&
          !refreshing.has(brokerId) &&
          now - (lastAttemptAt.get(brokerId) ?? 0) >= RETRY_COOLDOWN_MS
        ) {
          lastAttemptAt.set(brokerId, now);
          refreshing.add(brokerId);
          brokerApiClient
            .post<{ success: true; data: RefreshSessionResponseData }>(`/broker/${brokerId}/refresh-session`)
            .then(({ data }) => {
              const session = data.data;
              setConnected(brokerId, {
                ...info,
                sessionExpiresAt: Date.now() + session.expiresIn * 1000,
                jwtToken: session.jwtToken,
                refreshToken: session.refreshToken,
                feedToken: session.feedToken,
              });
            })
            .catch(() => {
              // Leave the existing countdown in place — the plain expiry
              // check above will disconnect it cleanly if it truly can't
              // recover before running out, and will retry meanwhile.
            })
            .finally(() => refreshing.delete(brokerId));
        }
      }
    };

    checkExpiry();
    const id = setInterval(checkExpiry, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
