import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { signToken } from './jwt.util';
import type { AppUser, AuthResponse, LoginInput, SignupInput, UserPreferences } from './auth.types';

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
  };
}

class AuthService {
  async signup(input: SignupInput): Promise<AuthResponse> {
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
    const result = await pool.query<UserRow>(
      `INSERT INTO users (id, name, email, phone, password_hash, preferences)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, input.name.trim(), email, input.phone?.trim() || null, passwordHash, JSON.stringify(DEFAULT_PREFERENCES)],
    );

    const user = toAppUser(result.rows[0]);
    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      throw new AuthApiError('Email and password are required.', 400);
    }

    const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    const row = result.rows[0];
    if (!row) {
      throw new AuthApiError('Invalid email or password.', 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, row.password_hash);
    if (!passwordMatches) {
      throw new AuthApiError('Invalid email or password.', 401);
    }

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

  private issueSession(user: AppUser): AuthResponse {
    const token = signToken({ sub: user.id, email: user.email });
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
