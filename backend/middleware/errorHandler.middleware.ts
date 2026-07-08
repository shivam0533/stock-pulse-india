import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/apiResponse';

/** Catches any request that didn't match a route. Register after all routers. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Final safety net — turns any thrown/rejected error (including malformed
 * JSON bodies from express.json()) into a consistent JSON response instead
 * of crashing the process or leaking a stack trace. Must be registered last
 * and keep all four parameters — Express detects error middleware by arity.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON in request body.', 400);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  sendError(res, message, 500);
}
