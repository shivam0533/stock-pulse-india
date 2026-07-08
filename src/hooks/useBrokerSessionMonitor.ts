import { useEffect } from 'react';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerToastStore } from '@store/brokerToast.store';
import type { BrokerId } from '@services/broker/broker.types';

const CHECK_INTERVAL_MS = 5000;

/**
 * Watches every connected broker session's `sessionExpiresAt` and auto-logs
 * it out (clears it from brokerConnection.store) the moment it passes — no
 * SmartAPI call involved, just a local timestamp check. Runs an immediate
 * check on mount (so an already-expired session left over from before a
 * refresh doesn't briefly render as "Connected"), then re-checks on an
 * interval. Mounted once at the app layout level so expiry is enforced no
 * matter which page the user is on.
 */
export function useBrokerSessionMonitor() {
  useEffect(() => {
    const checkExpiry = () => {
      const { connections, setDisconnected } = useBrokerConnectionStore.getState();
      const now = Date.now();
      for (const [brokerId, info] of Object.entries(connections)) {
        if (info && now >= info.sessionExpiresAt) {
          setDisconnected(brokerId as BrokerId);
          useBrokerToastStore.getState().push('error', `${info.brokerName} session expired. Please reconnect.`);
        }
      }
    };

    checkExpiry();
    const id = setInterval(checkExpiry, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
