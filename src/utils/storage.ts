/**
 * Type-safe localStorage wrapper. Silently no-ops on environments
 * without localStorage (SSR, sandboxed iframes).
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      if (typeof window === 'undefined') return fallback;
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota / disabled — swallow.
    }
  },

  remove(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.clear();
    } catch {
      // ignore
    }
  },
};
