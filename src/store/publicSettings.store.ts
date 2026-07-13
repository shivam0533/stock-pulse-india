import { create } from 'zustand';
import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';

interface PublicSettings {
  maintenanceMode: boolean;
  tradingEnabled: boolean;
  riskDefaults: { maxLossPercent: number; maxProfitPercent: number };
}

interface PublicSettingsState extends PublicSettings {
  loaded: boolean;
  fetch: () => Promise<void>;
}

/**
 * GET /api/settings/public (no auth) — set from the Admin Panel's Settings
 * page. Not persisted: re-fetched on every app load so a maintenance-mode
 * flip takes effect without needing a hard refresh from every user.
 * `tradingEnabled` defaults true / `maintenanceMode` defaults false so a
 * failed fetch (e.g. backend momentarily unreachable) never itself blocks
 * trading — same fail-open posture as the rest of this app's guards.
 */
export const usePublicSettingsStore = create<PublicSettingsState>()((set) => ({
  maintenanceMode: false,
  tradingEnabled: true,
  riskDefaults: { maxLossPercent: 3, maxProfitPercent: 7 },
  loaded: false,
  fetch: async () => {
    try {
      const { data } = await apiClient.get<PublicSettings>(ENDPOINTS.settings.public);
      set({
        maintenanceMode: data.maintenanceMode, tradingEnabled: data.tradingEnabled,
        riskDefaults: data.riskDefaults, loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
