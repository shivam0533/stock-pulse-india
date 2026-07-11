import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import { STORAGE_KEYS } from '@utils/constants';
import type {
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types';

// Deliberately independent of VITE_ENABLE_MOCK_API (which still governs the
// unrelated Dashboard stock-search/portfolio mock services) — real accounts
// are required for the Admin Panel's Users list to mean anything, so login/
// signup/session always hit the real backend (backend/auth/*) now.
const USE_MOCK = false;

const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Arjun Mehta',
  email: 'arjun@stockpulse.in',
  phone: '+91 98765 43210',
  panVerified: true,
  kycStatus: 'verified',
  role: 'user',
  joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 180,
  preferences: {
    defaultExchange: 'NSE',
    notifications: {
      priceAlerts: true,
      portfolioUpdates: true,
      marketNews: false,
    },
    display: {
      showInLakhs: true,
      compactView: false,
    },
  },
};

function delay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Mock-mode-only: reads whatever user was actually stored at login/signup
 * time (auth.store.ts's own zustand `persist`, key "sp_user") instead of
 * always returning the same hardcoded MOCK_USER. Without this,
 * getCurrentUser() — called by auth.store.ts's hydrate() on every page
 * load/refresh — overwrote the real signed-in name with "Arjun Mehta"
 * every single time, even though login/signup themselves stored the
 * correct name; only hydrate()'s follow-up call clobbered it.
 */
function readStoredMockUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: User | null } };
    return parsed.state?.user ?? null;
  } catch {
    return null;
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK) {
      // Light validation so the form gives realistic feedback
      if (!credentials.email.includes('@')) {
        throw { code: 'INVALID_EMAIL', message: 'Enter a valid email address' };
      }
      if (credentials.password.length < 6) {
        throw {
          code: 'INVALID_PASSWORD',
          message: 'Password must be at least 6 characters',
        };
      }
      // Reuse the name/profile from a previous signup/login with this same
      // email (if any) instead of always resetting to the generic demo
      // name — matches real auth behavior, where logging back in returns
      // *your* account, not a fresh one.
      const stored = readStoredMockUser();
      const baseUser = stored && stored.email === credentials.email ? stored : MOCK_USER;
      return delay({
        user: { ...baseUser, email: credentials.email },
        token: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresIn: 3600,
      });
    }
    const { data } = await apiClient.post<AuthResponse>(
      ENDPOINTS.auth.login,
      credentials
    );
    return data;
  },

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    if (USE_MOCK) {
      return delay({
        user: {
          ...MOCK_USER,
          name: credentials.name,
          email: credentials.email,
          phone: credentials.phone,
          kycStatus: 'pending',
          panVerified: false,
        },
        token: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresIn: 3600,
      });
    }
    const { data } = await apiClient.post<AuthResponse>(
      ENDPOINTS.auth.signup,
      credentials
    );
    return data;
  },

  async logout(): Promise<void> {
    if (USE_MOCK) return delay(undefined, 200);
    await apiClient.post(ENDPOINTS.auth.logout);
  },

  async getCurrentUser(): Promise<User> {
    // auth.store.ts's hydrate() calls this on every page load/refresh to
    // re-verify the session — it must return the account that's actually
    // signed in (readStoredMockUser()), not always the same hardcoded
    // demo user, or every refresh silently resets the signed-in name.
    if (USE_MOCK) return delay(readStoredMockUser() ?? MOCK_USER);
    const { data } = await apiClient.get<User>(ENDPOINTS.auth.me);
    return data;
  },

  // ── JWT refresh ────────────────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
    if (USE_MOCK) {
      if (!refreshToken) throw { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token missing' };
      return delay({ token: 'mock_token_refreshed_' + Date.now(), expiresIn: 3600 });
    }
    const { data } = await apiClient.post<{ token: string; expiresIn: number }>(
      ENDPOINTS.auth.refresh, { refreshToken }
    );
    return data;
  },

  // ── Password reset flow ────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    if (USE_MOCK) {
      if (!email.includes('@')) throw { code: 'INVALID_EMAIL', message: 'Enter a valid email address' };
      return delay(undefined, 800);
    }
    await apiClient.post(ENDPOINTS.auth.forgotPassword, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    if (USE_MOCK) {
      if (!token) throw { code: 'INVALID_TOKEN', message: 'Reset token is invalid or expired' };
      if (password.length < 8) throw { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' };
      return delay(undefined, 700);
    }
    await apiClient.post(ENDPOINTS.auth.resetPassword, { token, password });
  },

  // ── Profile management ─────────────────────────────────────────────
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    if (USE_MOCK) {
      return delay({ ...MOCK_USER, ...updates,
        preferences: { ...MOCK_USER.preferences, ...updates.preferences }
      });
    }
    const { data } = await apiClient.patch<User>(ENDPOINTS.user.profile, updates);
    return data;
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    if (USE_MOCK) {
      if (payload.currentPassword.length < 6)
        throw { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' };
      if (payload.newPassword.length < 8)
        throw { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters' };
      return delay(undefined, 700);
    }
    await apiClient.post(ENDPOINTS.auth.changePassword, payload);
  },
};
