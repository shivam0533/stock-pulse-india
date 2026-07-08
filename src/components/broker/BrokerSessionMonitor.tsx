import { useBrokerSessionMonitor } from '@hooks/useBrokerSessionMonitor';

/** Headless — mounts the app-wide broker session expiry watch. Renders nothing. */
export function BrokerSessionMonitor() {
  useBrokerSessionMonitor();
  return null;
}
