import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_TIMEOUTS, STORAGE_KEYS } from '@utils/constants';
import { storage } from '@utils/storage';

// Track in-flight refresh to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onRefreshDone(token: string) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

// Same backend origin brokerApiClient.ts already targets (VITE_API_URL,
// e.g. the deployed Railway backend), falling back to the relative /api
// path for local dev (Vite's dev-server proxy). Previously this pointed at
// VITE_API_BASE_URL — a placeholder external domain that was never a real
// backend, which is why real auth (once wired up) needs this fixed here.
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * The real backend (backend/utils/apiResponse.ts's sendSuccess) always
 * wraps successful responses as `{ success: true, data: T }` — this was
 * originally written against a hypothetical raw-JSON external API (the
 * mock-only stocks/dashboard/portfolio services never make a real network
 * call, so they were never affected either way). Unwrapping here once means
 * every apiClient.get/post<T>() caller keeps getting plain T in
 * response.data, exactly like before, now that real calls (auth, admin,
 * settings, notifications) actually reach this shape.
 */
function isSuccessEnvelope(body: unknown): body is { success: true; data: unknown } {
  return !!body && typeof body === 'object' && (body as { success?: unknown }).success === true && 'data' in body;
}
apiClient.interceptors.response.use((response) => {
  if (isSuccessEnvelope(response.data)) {
    response.data = response.data.data;
  }
  return response;
});

// Normalise errors + JWT refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = storage.get<string | null>(STORAGE_KEYS.REFRESH_TOKEN, null);

      // If we have a refresh token, try to get a new access token
      if (refreshToken && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          const { data } = await axios.post<{ token: string; expiresIn: number }>(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );
          const newToken = data.token;
          storage.set(STORAGE_KEYS.AUTH_TOKEN, newToken);
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
          onRefreshDone(newToken);
          isRefreshing = false;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed — clear session and redirect
          isRefreshing = false;
          pendingRequests = [];
          storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
          storage.remove(STORAGE_KEYS.USER);
          if (window.location.pathname !== '/login') window.location.assign('/login');
        }
      } else if (refreshToken && isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      } else {
        // No refresh token — force logout
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
        storage.remove(STORAGE_KEYS.USER);
        if (window.location.pathname !== '/login') window.location.assign('/login');
      }
    }

    const normalized = {
      code: error.response?.data?.code ?? error.code ?? 'UNKNOWN',
      message:
        error.response?.data?.message ??
        error.message ??
        'Something went wrong. Please try again.',
      status: error.response?.status,
    };

    return Promise.reject(normalized);
  }
);

export type NormalizedApiError = {
  code: string;
  message: string;
  status?: number;
};
