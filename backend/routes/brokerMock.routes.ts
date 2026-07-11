import { Router } from 'express';
import { brokerMockController } from '../controllers/brokerMock.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requireActiveSubscription } from '../subscriptions/subscription.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// This is the route the frontend's real Angel One login modal actually
// calls (POST /api/broker/login, matched before the parameterized
// /api/broker/:brokerId/* router below) — requireAuth here is what makes
// getDefaultBroker() below able to resolve *this specific app user's* own
// Angel One session instead of one shared global session.
// requireActiveSubscription locks out a user whose trial/subscription has
// expired — this route is the real broker connection surface.
router.use(requireAuth, requireActiveSubscription);

router.post('/login', asyncHandler(brokerMockController.login));
router.post('/logout', asyncHandler(brokerMockController.logout));
router.get('/profile', asyncHandler(brokerMockController.getProfile));
router.get('/funds', asyncHandler(brokerMockController.getFunds));
router.get('/positions', asyncHandler(brokerMockController.getPositions));
router.get('/holdings', asyncHandler(brokerMockController.getHoldings));
router.get('/orderbook', asyncHandler(brokerMockController.getOrderBook));
router.get('/tradebook', asyncHandler(brokerMockController.getTradeBook));

export { router as brokerMockRoutes };
