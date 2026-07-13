import 'dotenv/config';
import { createApp } from './app';
import { ensureUsersTable, ensureAdminTables, ensureSubscriptionTables, ensureTradesTable } from './db/pool';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

// Every Express route is already wrapped in asyncHandler (a rejected
// promise there reaches Express's own error middleware, not here) — these
// are pure insurance for anything outside the request/response cycle (the
// WebSocket reconnect loop, interval callbacks) that Node's default
// behavior would otherwise let crash the entire process silently, taking
// down every concurrent user's session with it, not just one request.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[Process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[Process] Uncaught exception — exiting so the process manager can restart cleanly:', err);
  process.exit(1);
});

async function start(): Promise<void> {
  await ensureUsersTable();
  await ensureAdminTables();
  await ensureSubscriptionTables();
  await ensureTradesTable();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Broker integration backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[Startup] Failed to start server:', err);
  process.exit(1);
});
