import 'dotenv/config';
import { createApp } from './app';
import { ensureUsersTable, ensureAdminTables } from './db/pool';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

async function start(): Promise<void> {
  await ensureUsersTable();
  await ensureAdminTables();
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
