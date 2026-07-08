import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@layouts/AppLayout';
import { AuthLayout } from '@layouts/AuthLayout';
import { LoadingScreen } from '@components/loading/LoadingScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { ROUTES } from '@utils/constants';

const Login = lazy(() => import('@pages/Login'));
const Signup = lazy(() => import('@pages/Signup'));
const ForgotPassword = lazy(() => import('@pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@pages/ResetPassword'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const StockDetail = lazy(() => import('@pages/StockDetail'));
const Profile = lazy(() => import('@pages/Profile'));
const OptionChain = lazy(() => import('@pages/OptionChain'));
const Positions = lazy(() => import('@pages/Positions'));
const TradeHistory = lazy(() => import('@pages/TradeHistory'));
const Performance = lazy(() => import('@pages/Performance'));
const Settings = lazy(() => import('@pages/Settings'));
const BrokerIntegration = lazy(() => import('@pages/BrokerIntegration'));
const KotakNeoIntegration = lazy(() => import('@pages/KotakNeoIntegration'));
const NotFound = lazy(() => import('@pages/NotFound'));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen message="Loading" />}>
        <Routes>
          {/* Public routes */}
          <Route
            element={
              <PublicRoute>
                <AuthLayout />
              </PublicRoute>
            }
          >
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.SIGNUP} element={<Signup />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          </Route>

          {/* Protected app routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.STOCK_DETAIL} element={<StockDetail />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.OPTION_CHAIN} element={<OptionChain />} />
            <Route path={ROUTES.POSITIONS} element={<Positions />} />
            <Route path={ROUTES.TRADE_HISTORY} element={<TradeHistory />} />
            <Route path={ROUTES.PERFORMANCE} element={<Performance />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.BROKER_INTEGRATION} element={<BrokerIntegration />} />
            <Route path={ROUTES.KOTAK_NEO_INTEGRATION} element={<KotakNeoIntegration />} />
          </Route>

          {/* Fallbacks */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
