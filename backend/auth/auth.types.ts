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

export type AppUserRole = 'user' | 'admin' | 'super_admin';

export type AppSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

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
  role: AppUserRole;
  subscriptionStatus: AppSubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
  isTradingLocked: boolean;
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
