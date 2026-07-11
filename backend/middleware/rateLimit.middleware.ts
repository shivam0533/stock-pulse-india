import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse';

/**
 * Brute-force protection for login/signup — the classic rate-limiting
 * target (credential stuffing, account enumeration via signup). Keyed by IP
 * (express-rate-limit's default), 15-minute sliding window. Every other
 * route is already gated by requireAuth/requireAdmin, so it isn't limited
 * here — a real JWT is a much stronger gate than an IP-based counter.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many attempts. Please try again in a few minutes.', 429);
  },
});
