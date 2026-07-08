import type { Request, Response } from 'express';
import { authService, AuthApiError } from './auth.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AuthApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected authentication error.';
  sendError(res, message, 500);
}

export const authController = {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, password } = req.body ?? {};
      const session = await authService.signup({ name, email, phone, password });
      sendSuccess(res, session, 201);
    } catch (err) {
      handleError(res, err);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body ?? {};
      const session = await authService.login({ email, password });
      sendSuccess(res, session, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    // Stateless JWT — nothing to invalidate server-side; the frontend
    // discards its stored token. Kept as a real endpoint so the existing
    // authService.logout() call has something to hit.
    sendSuccess(res, { success: true }, 200);
  },

  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const user = await authService.getUserById(req.userId);
      sendSuccess(res, user, 200);
    } catch (err) {
      handleError(res, err);
    }
  },
};
