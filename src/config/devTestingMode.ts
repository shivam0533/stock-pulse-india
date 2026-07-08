/**
 * Developer-only testing flag — when enabled, disables the intraday
 * market-hours restriction (3:20 PM IST auto square-off in
 * useOptionTradeMonitor.ts) so a trade's live ticking can be observed
 * outside real market hours. Production logic, Risk Settings, Stop
 * Loss/Target, and every other rule are completely unaffected either way.
 *
 * Structurally cannot be enabled in production: `import.meta.env.DEV` is a
 * compile-time constant that Vite hardcodes to `false` and dead-code-
 * eliminates in a production build — VITE_DEV_TESTING_MODE is never even
 * read there, regardless of what any .env file contains.
 */
export function isDevTestingModeEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_TESTING_MODE === 'true';
}
