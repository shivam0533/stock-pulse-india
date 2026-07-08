import { useEffect, useRef } from 'react';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { useBrokerStore } from '@store/broker.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useBrokerToastStore } from '@store/brokerToast.store';

/**
 * Requirement: "If Broker Status = Connected, automatically set Paper
 * Trading = OFF." Headless, mounted once app-wide. Watches the Angel One
 * connection and, the moment a NEW connection appears (guarded by
 * connectedAt so this fires once per login, not on every render — the user
 * can still manually turn Paper Trading back on afterward without this
 * immediately re-forcing it off), switches the app-wide active broker to
 * Angel One (useBrokerStore, existing action, unchanged) and turns Paper
 * Trading Only off (useOptionChainRiskStore, existing action, unchanged).
 *
 * This does NOT by itself let Auto Trading place real orders — that still
 * requires a separate, explicit "Live Auto Trading" acknowledgment in
 * AutoTradingPanel (useAutoTradingStore.liveTradingAcknowledged), checked
 * independently by useAutoTradingEngine.
 */
export function AngelOneLiveModeSync() {
  const connection = useBrokerConnectionStore((s) => s.connections.ANGEL_ONE);
  const appliedForConnectionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!connection) {
      appliedForConnectionRef.current = null;
      return;
    }
    if (appliedForConnectionRef.current === connection.connectedAt) return; // already applied for this session
    appliedForConnectionRef.current = connection.connectedAt;

    useBrokerStore.getState().setActiveBroker('ANGEL_ONE');

    const risk = useOptionChainRiskStore.getState();
    if (risk.paperTradingOnly) {
      risk.applySettings({
        maxLossPercent: risk.maxLossPercent,
        maxProfitPercent: risk.maxProfitPercent,
        applyAutomatically: risk.applyAutomatically,
        paperTradingOnly: false,
      });
      useBrokerToastStore.getState().push(
        'success',
        'Angel One connected — Paper Trading turned off. Manual Buy/Sell now routes to your real broker.',
      );
    }
  }, [connection]);

  return null;
}
