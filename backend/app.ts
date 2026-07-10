import express, { type Express } from 'express';
import cors from 'cors';
import { brokerRoutes } from './routes/broker.routes';
import { brokerMockRoutes } from './routes/brokerMock.routes';
import { kotakNeoRoutes } from './routes/kotakNeo.routes';
import { kotakNeoTradingRoutes } from './routes/kotakNeoTrading.routes';
import { niftyOptionChainRoutes } from './routes/niftyOptionChain.routes';
import { debugLogRoutes } from './routes/debugLog.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';

/** Express app factory — kept separate from server.ts so the app can be imported in tests without binding a port. */
export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Simple, brokerId-less mock surface (current phase) — mounted before the
  // parameterized router below so its literal paths (e.g. /login) always
  // win over the /:brokerId pattern.
  app.use('/api/broker', brokerMockRoutes);
  // Kotak Neo — real REST integration (kotakNeoService), dedicated routes.
  app.use('/api/broker/kotak', kotakNeoRoutes);
  // Kotak Neo trading layer (KotakNeoTradingService) — session integrated automatically.
  app.use('/api', kotakNeoTradingRoutes);
  // Real, live NIFTY Option Chain (Angel One instrument master + WebSocket + REST) — ONLY NIFTY options.
  app.use('/api/nifty', niftyOptionChainRoutes);
  // Multi-broker surface, ready for when more brokers than Angel One exist.
  app.use('/api/broker', brokerRoutes);
  // TEMP DIAGNOSTIC — relays frontend console logs here for the live Auto
  // Trading investigation. Remove once done.
  app.use('/api/debug-log', debugLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
