import { Router } from 'express';
import { brokerController } from '../controllers/broker.controller';
import { validateBrokerId, requireBrokerSession } from '../middleware/broker.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

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
