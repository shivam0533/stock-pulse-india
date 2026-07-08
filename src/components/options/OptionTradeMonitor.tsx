import { useOptionTradeMonitor } from '@hooks/useOptionTradeMonitor';

/** Headless — mounts the live option-trade monitoring loop app-wide. Renders nothing. */
export function OptionTradeMonitor() {
  useOptionTradeMonitor();
  return null;
}
