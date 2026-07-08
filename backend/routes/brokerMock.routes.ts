import { Router } from 'express';
import { brokerMockController } from '../controllers/brokerMock.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler(brokerMockController.login));
router.post('/logout', asyncHandler(brokerMockController.logout));
router.get('/profile', asyncHandler(brokerMockController.getProfile));
router.get('/funds', asyncHandler(brokerMockController.getFunds));
router.get('/positions', asyncHandler(brokerMockController.getPositions));
router.get('/holdings', asyncHandler(brokerMockController.getHoldings));
router.get('/orderbook', asyncHandler(brokerMockController.getOrderBook));
router.get('/tradebook', asyncHandler(brokerMockController.getTradeBook));

export { router as brokerMockRoutes };
