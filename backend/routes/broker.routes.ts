import { Router } from 'express';
import { brokerController } from '../controllers/broker.controller';
import { validateBrokerId, requireBrokerSession } from '../middleware/broker.middleware';
import { requireAuth } from '../auth/auth.middleware';
import { requireActiveSubscription } from '../subscriptions/subscription.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// This app's own login (requireAuth) gates every broker route — previously
// none of these required it at all, so req.userId (needed to key each
// user's own Angel One session) was never available, and anyone who could
// reach the server could hit these regardless of whether they'd ever
// logged into the app itself. requireActiveSubscription additionally locks
// out a user whose trial/subscription has expired — broker connection and
// order placement are exactly the "trading" surface the subscription gate
// covers.
router.use(requireAuth, requireActiveSubscription);
router.use('/:brokerId', validateBrokerId);

router.post('/:brokerId/login', asyncHandler(brokerController.login));
router.post('/:brokerId/logout', requireBrokerSession, asyncHandler(brokerController.logout));
router.post('/:brokerId/refresh-session', requireBrokerSession, asyncHandler(brokerController.refreshSession));

router.get('/:brokerId/profile', requireBrokerSession, asyncHandler(brokerController.getProfile));
router.get('/:brokerId/funds', requireBrokerSession, asyncHandler(brokerController.getFunds));
router.get('/:brokerId/positions', requireBrokerSession, asyncHandler(brokerController.getPositions));
router.get('/:brokerId/holdings', requireBrokerSession, asyncHandler(brokerController.getHoldings));

router.post('/:brokerId/orders', requireBrokerSession, asyncHandler(brokerController.placeOrder));
router.put('/:brokerId/orders/:orderId', requireBrokerSession, asyncHandler(brokerController.modifyOrder));
router.delete('/:brokerId/orders/:orderId', requireBrokerSession, asyncHandler(brokerController.cancelOrder));
router.get('/:brokerId/orders', requireBrokerSession, asyncHandler(brokerController.getOrderBook));
router.get('/:brokerId/trades', requireBrokerSession, asyncHandler(brokerController.getTradeBook));

router.post('/:brokerId/market-feed/connect', requireBrokerSession, asyncHandler(brokerController.connectMarketFeed));
router.post('/:brokerId/market-feed/disconnect', requireBrokerSession, asyncHandler(brokerController.disconnectMarketFeed));

export { router as brokerRoutes };
