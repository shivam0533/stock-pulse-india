import { useEffect } from 'react';
import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import { useNotificationsStore } from '@store/notifications.store';
import { useAuthStore } from '@store/auth.store';
import type { AdminNotificationEntry } from '@/types';

const POLL_MS = 60 * 1000;

/**
 * Headless — polls any Admin Panel-sent notifications addressed to this
 * user (broadcast or targeted) and feeds them into the existing
 * notifications.store.ts/NotificationsMenu.tsx via pushFromServer(), then
 * marks them read server-side so they aren't re-delivered next poll.
 */
export function ServerNotificationsSync() {
  const status = useAuthStore((s) => s.status);
  const pushFromServer = useNotificationsStore((s) => s.pushFromServer);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const poll = async () => {
      try {
        const { data } = await apiClient.get<AdminNotificationEntry[]>(ENDPOINTS.notifications.unread);
        if (data.length === 0) return;
        for (const n of data) {
          pushFromServer({ id: n.id, type: n.type, title: n.title, message: n.message, timestamp: n.createdAt });
        }
        await apiClient.post(ENDPOINTS.notifications.markRead, { ids: data.map((n) => n.id) });
      } catch {
        // Best-effort — a failed poll just retries next cycle.
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [status, pushFromServer]);

  return null;
}
