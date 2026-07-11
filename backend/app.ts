import express, { type Express } from 'express';
import cors from 'cors';
import { brokerRoutes } from './routes/broker.routes';
import { brokerMockRoutes } from './routes/brokerMock.routes';
import { kotakNeoRoutes } from './routes/kotakNeo.routes';
import { kotakNeoTradingRoutes } from './routes/kotakNeoTrading.routes';
import { niftyOptionChainRoutes } from './routes/niftyOptionChain.routes';
import { authRoutes } from './auth/auth.routes';
import { adminRoutes } from './admin/admin.routes';
import { settingsRoutes } from './routes/settings.routes';
import { userNotificationsRoutes } from './routes/notifications.routes';
import { subscriptionRoutes } from './subscriptions/subscription.routes';
import { adminSubscriptionRoutes } from './subscriptions/admin/adminSubscription.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';

// Wide-open cors() sent `Access-Control-Allow-Origin: *` to literally any
// origin. Bearer-token auth (not cookies) means this was never a CSRF
// vector, but restricting it is still cheap defense-in-depth against
// browser-based scanning/abuse. Allows this Vercel project's production +
// every preview deployment (they get a fresh subdomain per deploy — see
// `vercel ls` output, e.g. stock-pulse-india-<hash>-<team>.vercel.app) plus
// local dev origins. No origin header at all (curl, server-to-server) is
// allowed through unchanged, since that was never blocked by cors() either.
const ALLOWED_ORIGIN_PATTERN = /^https:\/\/stock-pulse-india(-[a-z0-9]+)*-shivamsrivastav2508-3960s-projects\.vercel\.app$|^https:\/\/stock-pulse-india-pi\.vercel\.app$|^http:\/\/localhost:\d+$/;

/** Express app factory — kept separate from server.ts so the app can be imported in tests without binding a port. */
export function createApp(): Express {
  const app = express();
  // Railway (and Vercel/Heroku/Render — every reverse-proxy PaaS) terminates
  // TLS and forwards requests through exactly one hop, setting `X-Forwarded-For`
  // to the real client IP. Without this, Express's default `trust proxy: false`
  // makes express-rate-limit's IP-based key generator throw
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR — and worse, without a trustworthy
  // client IP every request behind the proxy can collapse onto the same
  // rate-limit bucket, letting one user's request volume throttle another's.
  // `1` trusts exactly the immediate proxy hop, not the whole forwarded chain.
  app.set('trust proxy', 1);
  app.use(cors({
    // `callback(null, false)` (not an Error) — cors() then just omits the
    // Access-Control-Allow-Origin header, which is all a browser actually
    // checks; throwing instead would surface as an ugly unrelated 500 on
    // every rejected preflight.
    origin: (origin, callback) => {
      callback(null, !origin || ALLOWED_ORIGIN_PATTERN.test(origin));
    },
  }));
  // Default 100kb is fine for every route except the optional base64
  // payment-screenshot upload (subscription.routes.ts) — the frontend
  // downsizes the image client-side first, so 4mb is a ceiling, not the norm.
  app.use(express.json({ limit: '4mb' }));

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
  // This app's own account system (signup/login/me) — separate from, and in
  // addition to, the Angel One broker session above.
  app.use('/api/auth', authRoutes);
  // Admin Panel surface — every route behind requireAuth + requireAdmin.
  app.use('/api/admin', adminRoutes);
  // Trial/subscription: user-facing status + payment-request submission.
  app.use('/api/subscription', subscriptionRoutes);
  // Trial/subscription: admin review + activation surface.
  app.use('/api/admin/subscriptions', adminSubscriptionRoutes);
  // Public (no auth) — main app polls this for maintenanceMode/tradingEnabled.
  app.use('/api/settings', settingsRoutes);
  // Any logged-in user's own admin-sent notifications (not admin-only).
  app.use('/api/notifications', userNotificationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
