import { Router } from 'express';
import { tradesController } from './trades.controller';
import { requireAuth } from '../auth/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// requireAuth only — recording a completed trade is persistence, not a
// trading action itself, so it's deliberately NOT behind
// requireActiveSubscription (a trade that just closed must always be
// recordable, even if the user's subscription lapsed in the interim).
router.use(requireAuth);

router.post('/', asyncHandler(tradesController.record));

export { router as tradesRoutes };
