export type UserRole = 'user' | 'admin' | 'super_admin';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  panVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';
  joinedAt: number;
  preferences: UserPreferences;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
  isTradingLocked: boolean;
}

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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  phone: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface TokenPayload {
  sub: string;      // user id
  email: string;
  iat: number;      // issued at
  exp: number;      // expiry (unix seconds)
}

export interface PasswordResetRequest {
  token: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
