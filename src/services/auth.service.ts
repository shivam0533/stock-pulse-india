import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import type {
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types';

const USE_MOCK = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Arjun Mehta',
  email: 'arjun@stockpulse.in',
  phone: '+91 98765 43210',
  panVerified: true,
  kycStatus: 'verified',
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
      return delay({
        user: { ...MOCK_USER, email: credentials.email },
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
    if (USE_MOCK) return delay(MOCK_USER);
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
