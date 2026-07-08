import { Router } from 'express';
import { niftyOptionChainController } from '../controllers/niftyOptionChain.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/positions', asyncHandler(niftyOptionChainController.getPositions));
router.get('/expiries', asyncHandler(niftyOptionChainController.getExpiries));
router.get('/option-chain', asyncHandler(niftyOptionChainController.getChain));
router.get('/option-chain/stream', asyncHandler(niftyOptionChainController.streamChain));
router.get('/quote', asyncHandler(niftyOptionChainController.getQuote));
router.post('/orders/place', asyncHandler(niftyOptionChainController.placeOrder));

export { router as niftyOptionChainRoutes };
