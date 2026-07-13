import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePublicSettingsStore } from '@store/publicSettings.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';

const POLL_MS = 5 * 60 * 1000;

/**
 * Fetches /api/settings/public once on mount and periodically, and renders
 * the Maintenance Mode banner (set from the Admin Panel) when active. Also
 * the one global bootstrap point that applies the Admin Panel's Risk
 * Defaults to a genuinely fresh browser's Option Chain Risk Settings
 * (Phase 2) — see optionChainRisk.store.ts's applyServerDefaultsOnce for why
 * this is safe to call on every poll (it no-ops after the first apply).
 */
export function MaintenanceBanner() {
  const { maintenanceMode, riskDefaults, fetch } = usePublicSettingsStore();

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  useEffect(() => {
    useOptionChainRiskStore.getState().applyServerDefaultsOnce(riskDefaults);
  }, [riskDefaults]);

  if (!maintenanceMode) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-brand-400/15 border-b border-brand-400/30 text-brand-300 text-xs font-medium">
      <AlertTriangle size={14} className="shrink-0" />
      Scheduled maintenance is in progress — some features may be temporarily affected.
    </div>
  );
}
