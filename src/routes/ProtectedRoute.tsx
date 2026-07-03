import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@store/auth.store';
import { LoadingScreen } from '@components/loading/LoadingScreen';
import { ROUTES } from '@utils/constants';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === 'loading' || status === 'idle') {
    return <LoadingScreen message="Verifying session" />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
