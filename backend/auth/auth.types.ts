/** Mirrors the frontend's src/types/auth.types.ts exactly — the response shapes here are consumed as-is by the existing auth.store.ts/auth.service.ts, unchanged. */

export interface UserPreferences {
  defaultExchange: 'NSE' | 'BSE';
  notifications: {
    priceAlerts: boolean;
    portfolioUpdates: boolean;
    marketNews: boolean;
  };
  display: {
    showInLakhs: boolean;
    compactView: boolean;
  };
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  panVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';
  joinedAt: number;
  preferences: UserPreferences;
}

export interface AuthResponse {
  user: AppUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
