import type { Request, Response } from 'express';
import { authService, AuthApiError } from './auth.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AuthApiError) {
    // Deliberately curated, user-facing messages (e.g. "Invalid email or
    // password") — safe to return as-is.
    sendError(res, err.message, err.statusCode);
    return;
  }
  // Anything else (e.g. a raw Postgres error) is an internal detail, not
  // something to leak to the client.
  // eslint-disable-next-line no-console
  console.error('[Auth API] error:', err);
  sendError(res, 'Something went wrong. Please try again.', 500);
}

function requestContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const authController = {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, password } = req.body ?? {};
      const session = await authService.signup({ name, email, phone, password }, requestContext(req));
      sendSuccess(res, session, 201);
    } catch (err) {
      handleError(res, err);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body ?? {};
      const session = await authService.login({ email, password }, requestContext(req));
      sendSuccess(res, session, 200);
    } catch (err) {
      handleError(res, err);
    }
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const { currentPassword, newPassword } = req.body ?? {};
      await authService.changePassword(req.userId, currentPassword, newPassword);
      sendSuccess(res, { success: true }, 200);
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
