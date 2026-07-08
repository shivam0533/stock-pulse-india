import { useAutoTradingEngine } from '@hooks/useAutoTradingEngine';
import { useTrailingStopEngine } from '@hooks/useTrailingStopEngine';

/** Headless — mounts the app-wide Auto Trading engine (+ optional trailing stop). Renders nothing. */
export function AutoTradingMonitor() {
  useAutoTradingEngine();
  useTrailingStopEngine();
  return null;
}
