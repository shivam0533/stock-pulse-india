import type { NextFunction, Request, Response } from 'express';
import { brokerManagerService } from '../services/brokerManager.service';
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
 * Placeholder session guard — currently a no-op pass-through since no real
 * session/authentication exists yet. Once SmartAPI login is implemented,
 * this will verify a valid session/JWT exists for the requested broker
 * before allowing the request through.
 */
export function requireBrokerSession(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
