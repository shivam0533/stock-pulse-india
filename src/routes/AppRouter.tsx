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
const Markets = lazy(() => import('@pages/Markets'));
const StockDetail = lazy(() => import('@pages/StockDetail'));
const Portfolio = lazy(() => import('@pages/Portfolio'));
const Watchlist = lazy(() => import('@pages/Watchlist'));
const News = lazy(() => import('@pages/News'));
const Profile = lazy(() => import('@pages/Profile'));
const OptionChain = lazy(() => import('@pages/OptionChain'));
const AISignals = lazy(() => import('@pages/AISignals'));
const AlgoConsole = lazy(() => import('@pages/AlgoConsole'));
const PerformanceAnalytics = lazy(() => import('@pages/PerformanceAnalytics'));
const TradeHistory = lazy(() => import('@pages/TradeHistory'));
const Settings = lazy(() => import('@pages/Settings'));
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
            <Route path={ROUTES.MARKETS} element={<Markets />} />
            <Route path={ROUTES.STOCK_DETAIL} element={<StockDetail />} />
            <Route path={ROUTES.PORTFOLIO} element={<Portfolio />} />
            <Route path={ROUTES.WATCHLIST} element={<Watchlist />} />
            <Route path={ROUTES.NEWS} element={<News />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.OPTION_CHAIN} element={<OptionChain />} />
            <Route path={ROUTES.SIGNALS} element={<AISignals />} />
            <Route path={ROUTES.ALGO} element={<AlgoConsole />} />
            <Route path={ROUTES.ANALYTICS} element={<PerformanceAnalytics />} />
            <Route path={ROUTES.TRADE_HISTORY} element={<TradeHistory />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
          </Route>

          {/* Fallbacks */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
