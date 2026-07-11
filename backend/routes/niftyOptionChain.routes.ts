import { Router } from 'express';
import { niftyOptionChainController } from '../controllers/niftyOptionChain.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requireActiveSubscription } from '../subscriptions/subscription.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// This app's own login gates every route here — previously none of these
// required it, so positions/orders were resolved against one global Angel
// One session with no concept of which app user was asking. requireAuth
// already supports a `?token=` query param (in addition to the normal
// Authorization header) specifically for the two SSE routes below, since a
// browser's native EventSource can't set custom headers.
// requireActiveSubscription covers "Auto Trading"/"Live Trading" from the
// subscription spec — the client-side auto-trading engine places/exits
// orders through these same routes, so gating this file once covers both.
router.use(requireAuth, requireActiveSubscription);

router.get('/positions', asyncHandler(niftyOptionChainController.getPositions));
router.get('/positions/stream', asyncHandler(niftyOptionChainController.streamPositions));
router.get('/expiries', asyncHandler(niftyOptionChainController.getExpiries));
router.get('/option-chain', asyncHandler(niftyOptionChainController.getChain));
router.get('/option-chain/stream', asyncHandler(niftyOptionChainController.streamChain));
router.get('/quote', asyncHandler(niftyOptionChainController.getQuote));
router.post('/orders/place', asyncHandler(niftyOptionChainController.placeOrder));
router.post('/orders/exit', asyncHandler(niftyOptionChainController.exitOrder));

export { router as niftyOptionChainRoutes };
