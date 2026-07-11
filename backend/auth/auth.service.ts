import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { signToken } from './jwt.util';
import { adminEmails } from '../config/env';
import type { AppUser, AppUserRole, AuthResponse, LoginInput, SignupInput, UserPreferences } from './auth.types';

export class AuthApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AuthApiError';
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultExchange: 'NSE',
  notifications: { priceAlerts: true, portfolioUpdates: true, marketNews: false },
  display: { showInLakhs: false, compactView: false },
};

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — matches JWT_EXPIRES_IN default in jwt.util.ts

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  pan_verified: boolean;
  kyc_status: 'pending' | 'verified' | 'rejected';
  preferences: UserPreferences;
  joined_at: string;
  role: AppUserRole;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    panVerified: row.pan_verified,
    kycStatus: row.kyc_status,
    joinedAt: new Date(row.joined_at).getTime(),
    preferences: row.preferences,
    role: row.role,
  };
}

class AuthService {
  /** Records every login attempt (success and failure) for the Admin Panel's Logs page — never lets a logging failure break the actual login/signup flow. */
  private async recordLoginAttempt(email: string, userId: string | null, success: boolean, ctx?: RequestContext): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO login_logs (id, user_id, email, ip_address, user_agent, success)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), userId, email, ctx?.ipAddress ?? null, ctx?.userAgent ?? null, success],
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Auth] Failed to record login_logs row (non-fatal):', err);
    }
  }

  async signup(input: SignupInput, ctx?: RequestContext): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    if (!input.name?.trim() || !email || !input.password || input.password.length < 6) {
      throw new AuthApiError('Name, a valid email, and a password of at least 6 characters are required.', 400);
    }

    const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AuthApiError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const id = randomUUID();
    const role: AppUserRole = adminEmails.has(email) ? 'admin' : 'user';
    const result = await pool.query<UserRow>(
      `INSERT INTO users (id, name, email, phone, password_hash, preferences, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, input.name.trim(), email, input.phone?.trim() || null, passwordHash, JSON.stringify(DEFAULT_PREFERENCES), role],
    );

    const user = toAppUser(result.rows[0]);
    await this.recordLoginAttempt(email, user.id, true, ctx);
    return this.issueSession(user);
  }

  async login(input: LoginInput, ctx?: RequestContext): Promise<AuthResponse> {
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      throw new AuthApiError('Email and password are required.', 400);
    }

    const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    const row = result.rows[0];
    if (!row) {
      await this.recordLoginAttempt(email, null, false, ctx);
      throw new AuthApiError('Invalid email or password.', 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, row.password_hash);
    if (!passwordMatches) {
      await this.recordLoginAttempt(email, row.id, false, ctx);
      throw new AuthApiError('Invalid email or password.', 401);
    }

    // Promote to admin on login if this email was added to ADMIN_EMAILS
    // after the account was created — never auto-demotes, so removing an
    // email from the list doesn't silently revoke an existing admin.
    if (adminEmails.has(email) && row.role !== 'admin') {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', row.id]);
      row.role = 'admin';
    }

    await this.recordLoginAttempt(email, row.id, true, ctx);
    return this.issueSession(toAppUser(row));
  }

  async getUserById(userId: string): Promise<AppUser> {
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row) {
      throw new AuthApiError('User not found.', 404);
    }
    return toAppUser(row);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthApiError('New password must be at least 8 characters.', 400);
    }
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row) {
      throw new AuthApiError('User not found.', 404);
    }
    const matches = await bcrypt.compare(currentPassword ?? '', row.password_hash);
    if (!matches) {
      throw new AuthApiError('Current password is incorrect.', 401);
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }

  private issueSession(user: AppUser): AuthResponse {
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return {
      user,
      token,
      // Stateless JWT — there is no separate refresh-token mechanism yet, so
      // the same token is returned here. The frontend's refresh flow simply
      // re-issues an equally-valid token rather than failing.
      refreshToken: token,
      expiresIn: TOKEN_TTL_SECONDS,
    };
  }
}

export const authService = new AuthService();
