export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type Theme = 'dark' | 'light' | 'system';

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
}

export * from './stock.types';
export * from './auth.types';
export * from './dashboard.types';
export * from './notification.types';
export * from './options.types';
export * from './signals.types';
export * from './algo.types';
export * from './analytics.types';
export * from './tradeHistory.types';
