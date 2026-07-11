import type { NextFunction, Request, Response } from 'express';
import { brokerManagerService, type SupportedBrokerId } from '../services/brokerManager.service';
import { sendError } from '../utils/apiResponse';

/** Validates :brokerId against the registry before any controller runs. */
export function validateBrokerId(req: Request, res: Response, next: NextFunction): void {
  const brokerId = (req.params.brokerId ?? '').toUpperCase();
  if (!brokerManagerService.isSupported(brokerId)) {
    sendError(
      res,
      `Unsupported or missing broker id. Supported: ${brokerManagerService.getSupportedBrokers().join(', ')}`,
      400,
    );
    return;
  }
  next();
}

/**
 * Real per-user session guard — must run after requireAuth (needs
 * req.userId). Resolves *this specific user's* broker instance from the
 * registry and checks whether it actually has a live session, instead of
 * the previous no-op that let every request through regardless of whether
 * anyone was connected at all.
 */
export function requireBrokerSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    sendError(res, 'Authentication required. Please log in.', 401);
    return;
  }
  const brokerId = (req.params.brokerId ?? '').toUpperCase() as SupportedBrokerId;
  const broker = brokerManagerService.getBroker(brokerId, req.userId);
  if (!broker.hasSession()) {
    sendError(res, 'Not connected to Angel One. Please log in again.', 401);
    return;
  }
  next();
}
