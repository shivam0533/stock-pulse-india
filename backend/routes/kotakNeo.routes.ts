import { Router } from 'express';
import { kotakNeoController } from '../controllers/kotakNeo.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requireActiveSubscription } from '../subscriptions/subscription.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Previously had no auth at all — closing the same gap already fixed on
// broker.routes.ts/niftyOptionChain.routes.ts, since this is real broker
// connection surface too (Kotak Neo isn't the broker actually wired to
// live trading today, but it's still a real login/session endpoint that
// shouldn't be reachable by anyone who can hit the Railway URL).
router.use(requireAuth, requireActiveSubscription);

router.post('/login', asyncHandler(kotakNeoController.login));
router.post('/logout', asyncHandler(kotakNeoController.logout));
router.get('/status', asyncHandler(kotakNeoController.status));

export { router as kotakNeoRoutes };
