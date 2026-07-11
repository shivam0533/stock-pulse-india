import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@store/auth.store';

interface SuperAdminRouteProps {
  children: ReactNode;
}

/**
 * UX convenience only, same caveat as AdminRoute.tsx — the real boundary
 * is the backend's requireSuperAdmin (backend/auth/auth.middleware.ts) on
 * the Settings/role-management endpoints. Narrower than AdminRoute: a
 * plain ADMIN passes AdminRoute but is redirected here, since "manage
 * settings" / "manage admins" are SUPER_ADMIN-only capabilities.
 */
export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user } = useAuthStore();

  if (user?.role !== 'super_admin') {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}
