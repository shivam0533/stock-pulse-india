import { Router } from 'express';
import { kotakNeoTradingController } from '../controllers/kotakNeoTrading.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requireActiveSubscription } from '../subscriptions/subscription.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Deliberately NOT router.use(requireAuth, ...) — this router is mounted at
// bare '/api' in app.ts (a pre-existing quirk of this file, not something to
// fix here), so a path-less router-level middleware would run on every
// request that reaches this mount point regardless of whether the remainder
// path matches one of this router's own routes below — including
// /api/auth/signup, /api/subscription/status, etc. mounted after it. Gating
// per-route instead scopes it correctly to just this file's own endpoints.
router.post('/orders/place', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.placeOrder));
router.post('/orders/modify', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.modifyOrder));
router.post('/orders/cancel', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.cancelOrder));
router.get('/orders/book', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.getOrderBook));
router.get('/trades', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.getTradeBook));
router.get('/positions', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.getPositions));
router.get('/holdings', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.getHoldings));
router.get('/funds', requireAuth, requireActiveSubscription, asyncHandler(kotakNeoTradingController.getFunds));

export { router as kotakNeoTradingRoutes };
