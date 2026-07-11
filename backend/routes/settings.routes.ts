import { Router } from 'express';
import type { Request, Response } from 'express';
import { getPublicSettings } from '../services/appSettings.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Public (no auth) — the main app polls this once per session to know
 * whether Maintenance Mode or Trading Enable/Disable (set from the Admin
 * Panel's Settings page) are currently active. Deliberately unauthenticated
 * since every visitor, logged in or not, needs to see the maintenance
 * banner.
 */
router.get('/public', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const settings = await getPublicSettings();
    sendSuccess(res, settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load settings.';
    sendError(res, message, 500);
  }
}));

export { router as settingsRoutes };
