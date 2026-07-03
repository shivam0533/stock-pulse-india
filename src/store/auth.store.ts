import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@services/auth.service';
import { storage } from '@utils/storage';
import { STORAGE_KEYS } from '@utils/constants';
import type {
  User,
  LoginCredentials,
  SignupCredentials,
  AuthStatus,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiresAt: number | null;   // unix ms — JWT expiry
  status: AuthStatus;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
  // New actions
  refreshAccessToken: () => Promise<void>;
  updateProfile: (updates: UpdateProfileRequest) => Promise<void>;
  changePassword: (payload: ChangePasswordRequest) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiresAt: null,
      status: 'idle',
      error: null,

      login: async (credentials) => {
        set({ status: 'loading', error: null });
        try {
          const response = await authService.login(credentials);
          storage.set(STORAGE_KEYS.AUTH_TOKEN, response.token);
          storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
          set({
            user: response.user,
            token: response.token,
            tokenExpiresAt: Date.now() + response.expiresIn * 1000,
            status: 'authenticated',
            error: null,
          });
        } catch (err) {
          const message = (err as { message?: string }).message ?? 'Login failed';
          set({ status: 'unauthenticated', error: message });
          throw err;
        }
      },

      signup: async (credentials) => {
        set({ status: 'loading', error: null });
        try {
          const response = await authService.signup(credentials);
          storage.set(STORAGE_KEYS.AUTH_TOKEN, response.token);
          storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
          set({
            user: response.user,
            token: response.token,
            tokenExpiresAt: Date.now() + response.expiresIn * 1000,
            status: 'authenticated',
            error: null,
          });
        } catch (err) {
          const message = (err as { message?: string }).message ?? 'Signup failed';
          set({ status: 'unauthenticated', error: message });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
          storage.remove(STORAGE_KEYS.USER);
          set({ user: null, token: null, tokenExpiresAt: null, status: 'unauthenticated', error: null });
        }
      },

      hydrate: async () => {
        const token = storage.get<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
        if (!token) {
          set({ status: 'unauthenticated' });
          return;
        }
        try {
          const user = await authService.getCurrentUser();
          set({ user, token, status: 'authenticated' });
        } catch {
          storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          set({ status: 'unauthenticated' });
        }
      },

      clearError: () => set({ error: null }),

      refreshAccessToken: async () => {
        const refreshToken = storage.get<string | null>(STORAGE_KEYS.REFRESH_TOKEN, null);
        if (!refreshToken) { get().logout(); return; }
        try {
          const { token, expiresIn } = await authService.refreshToken(refreshToken);
          storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
          set({ token, tokenExpiresAt: Date.now() + expiresIn * 1000 });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (updates) => {
        set({ error: null });
        try {
          const user = await authService.updateProfile(updates);
          set({ user });
        } catch (err) {
          const message = (err as { message?: string }).message ?? 'Update failed';
          set({ error: message });
          throw err;
        }
      },

      changePassword: async (payload) => {
        set({ error: null });
        try {
          await authService.changePassword(payload);
        } catch (err) {
          const message = (err as { message?: string }).message ?? 'Password change failed';
          set({ error: message });
          throw err;
        }
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, tokenExpiresAt: state.tokenExpiresAt }),
    }
  )
);
