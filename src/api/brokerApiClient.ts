import axios from 'axios';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerToastStore } from '@store/brokerToast.store';

/**
 * Dedicated HTTP client for the real broker-integration backend (backend/).
 * Deliberately does NOT reuse the shared `apiClient` / VITE_API_BASE_URL —
 * that env var points at the rest of this app's external mock-data domain.
 *
 * Base URL resolution: VITE_API_URL if set (frontend and backend deployed
 * to different origins, e.g. Vercel + Railway), otherwise a relative /api
 * path, which Vite's own dev/preview proxy forwards to localhost:4000 (see
 * vite.config.ts) — unchanged local-dev behavior.
 */
export function apiOrigin(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

export const brokerApiClient = axios.create({
  baseURL: `${apiOrigin()}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * The backend's Angel One session lives only in server memory
 * (angelOne.service.ts) — it does not survive a backend restart. Until now,
 * nothing told the frontend's persisted "Connected" state
 * (brokerConnection.store.ts) that this happened, so it kept showing
 * "Connected" from a stale localStorage record even after the backend had
 * genuinely lost the session, until its own unrelated 1-hour timer expired.
 * This reconciles the two the moment reality actually diverges: any 401
 * carrying the backend's exact "not connected" message means the session is
 * really gone, so the stale frontend flag is cleared immediately instead of
 * continuing to lie until the timer catches up.
 */
brokerApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const message = (error.response.data as { message?: string } | undefined)?.message ?? '';
      if (message.includes('Not connected to Angel One')) {
        const wasConnected = !!useBrokerConnectionStore.getState().connections.ANGEL_ONE;
        useBrokerConnectionStore.getState().setDisconnected('ANGEL_ONE');
        if (wasConnected) {
          useBrokerToastStore.getState().push('error', 'Angel One session expired. Please reconnect.');
        }
      }
    }
    return Promise.reject(error);
  },
);

export interface BrokerApiErrorShape {
  message: string;
}

export function toBrokerApiError(err: unknown): BrokerApiErrorShape {
  if (axios.isAxiosError(err)) {
    const serverMessage = (err.response?.data as { message?: string } | undefined)?.message;
    return { message: serverMessage ?? err.message ?? 'Unable to reach the broker backend.' };
  }
  return { message: err instanceof Error ? err.message : 'Unable to reach the broker backend.' };
}
