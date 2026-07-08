import type { Request, Response } from 'express';
import { kotakNeoService, KotakNeoApiError } from '../services/kotakNeoService';
import { sendSuccess, sendError } from '../utils/apiResponse';
import type { KotakNeoLoginRequest } from '../services/kotakNeo.types';

/**
 * HTTP glue only — all real logic (HTTP calls to Kotak, session storage,
 * retries, error extraction) lives in kotakNeoService. Each handler maps a
 * thrown KotakNeoApiError to its real statusCode (401 for an expired/
 * missing session, Kotak's own upstream status otherwise) instead of the
 * shared error middleware's blanket 500, so failures surface accurately.
 * Route bodies here never see or forward the raw session token;
 * kotakNeoService only ever returns non-sensitive session metadata.
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
      const summary = await kotakNeoService.login(req.body as KotakNeoLoginRequest);
      sendSuccess(res, summary);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      const result = await kotakNeoService.logout();
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async status(_req: Request, res: Response): Promise<void> {
    try {
      const status = await kotakNeoService.validateSession();
      sendSuccess(res, status);
    } catch (err) {
      handleError(res, err);
    }
  },
};
