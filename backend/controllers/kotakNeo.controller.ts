import type { Request, Response } from 'express';
import { KotakNeoApiError } from '../services/kotakNeoService';
import { getOrCreateKotakNeoSession } from '../services/kotakNeoSessionRegistry';
import { sendSuccess, sendError } from '../utils/apiResponse';
import type { KotakNeoLoginRequest } from '../services/kotakNeo.types';

/**
 * HTTP glue only — all real logic (HTTP calls to Kotak, session storage,
 * retries, error extraction) lives in KotakNeoService. Each handler
 * resolves *this specific app user's* own Kotak Neo session via the
 * registry (req.userId, set by requireAuth) — never a shared/global
 * instance, so one user's login can never be visible to another. Each
 * handler maps a thrown KotakNeoApiError to its real statusCode (401 for an
 * expired/missing session, Kotak's own upstream status otherwise) instead
 * of the shared error middleware's blanket 500, so failures surface
 * accurately. Route bodies here never see or forward the raw session
 * token; kotakNeoService only ever returns non-sensitive session metadata.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof KotakNeoApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected Kotak Neo error.';
  sendError(res, message, 500);
}

export const kotakNeoController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const summary = await getOrCreateKotakNeoSession(req.userId!).login(req.body as KotakNeoLoginRequest);
      sendSuccess(res, summary);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await getOrCreateKotakNeoSession(req.userId!).logout();
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async status(req: Request, res: Response): Promise<void> {
    try {
      const status = await getOrCreateKotakNeoSession(req.userId!).validateSession();
      sendSuccess(res, status);
    } catch (err) {
      handleError(res, err);
    }
  },
};
