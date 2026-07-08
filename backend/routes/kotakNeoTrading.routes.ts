import { Router } from 'express';
import { kotakNeoTradingController } from '../controllers/kotakNeoTrading.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/orders/place', asyncHandler(kotakNeoTradingController.placeOrder));
router.post('/orders/modify', asyncHandler(kotakNeoTradingController.modifyOrder));
router.post('/orders/cancel', asyncHandler(kotakNeoTradingController.cancelOrder));
router.get('/orders/book', asyncHandler(kotakNeoTradingController.getOrderBook));
router.get('/trades', asyncHandler(kotakNeoTradingController.getTradeBook));
router.get('/positions', asyncHandler(kotakNeoTradingController.getPositions));
router.get('/holdings', asyncHandler(kotakNeoTradingController.getHoldings));
router.get('/funds', asyncHandler(kotakNeoTradingController.getFunds));

export { router as kotakNeoTradingRoutes };
