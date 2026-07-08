import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt.util';
import { sendError } from '../utils/apiResponse';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Protects the real trading API (broker/nifty routes) with this app's own
 * login — separate from, and in addition to, the Angel One broker session.
 * Accepts the token either as a normal `Authorization: Bearer <token>`
 * header, or as a `?token=` query param — the latter exists only because
 * the browser's native EventSource (used for the option-chain SSE stream)
 * cannot set custom headers.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = bearerToken || (typeof req.query.token === 'string' ? req.query.token : undefined);

  if (!token) {
    sendError(res, 'Authentication required. Please log in.', 401);
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    sendError(res, 'Your session has expired. Please log in again.', 401);
    return;
  }

  req.userId = payload.sub;
  next();
}
