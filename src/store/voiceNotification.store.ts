import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Voice Notifications ON/OFF — the single, small, user-configurable setting
 * this feature needs (Settings page). Default ON. Fully separate from the
 * visual Notifications drawer/toast stores; only read by voiceAnnouncement
 * service before speaking anything.
 */
interface VoiceNotificationState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useVoiceNotificationStore = create<VoiceNotificationState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'voice-notification-store' },
  ),
);
