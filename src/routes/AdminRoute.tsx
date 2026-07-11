import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@store/auth.store';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * UX convenience only — hides the /admin UI from non-admins so they don't
 * see a broken page. This is NOT the security boundary: every /api/admin/*
 * request is independently gated server-side by requireAuth + requireAdmin
 * (backend/auth/auth.middleware.ts), which checks role straight from the
 * JWT. Both ADMIN and SUPER_ADMIN pass here — see SuperAdminRoute.tsx for
 * the narrower SUPER_ADMIN-only surface (Settings). Rendered inside
 * ProtectedRoute, so `user` is always non-null here.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuthStore();

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}
