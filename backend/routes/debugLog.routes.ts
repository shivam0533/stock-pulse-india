import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// TEMP DIAGNOSTIC — relays frontend console output to this backend's own
// stdout, so it can be observed without browser DevTools access. Fire-and-
// forget from the frontend; never blocks or affects any trading logic.
// Remove once the live Auto Trading investigation is done.
router.post('/', (req: Request, res: Response) => {
  const { message } = req.body ?? {};
  // eslint-disable-next-line no-console
  console.log('\n[FRONTEND-RELAY]\n' + String(message ?? ''));
  res.status(204).end();
});

export { router as debugLogRoutes };
