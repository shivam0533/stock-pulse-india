import { Router } from 'express';
import { kotakNeoController } from '../controllers/kotakNeo.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler(kotakNeoController.login));
router.post('/logout', asyncHandler(kotakNeoController.logout));
router.get('/status', asyncHandler(kotakNeoController.status));

export { router as kotakNeoRoutes };
