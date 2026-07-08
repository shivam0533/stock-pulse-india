import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export function isJwtConfigured(): boolean {
  return !!JWT_SECRET;
}

export interface AppTokenPayload {
  sub: string; // user id
  email: string;
}

export function signToken(payload: AppTokenPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Returns the decoded payload, or null if the token is missing/invalid/expired — never throws. */
export function verifyToken(token: string): AppTokenPayload | null {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AppTokenPayload;
  } catch {
    return null;
  }
}
