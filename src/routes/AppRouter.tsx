import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@layouts/AppLayout';
import { AuthLayout } from '@layouts/AuthLayout';
import { LoadingScreen } from '@components/loading/LoadingScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AdminRoute } from './AdminRoute';
import { SuperAdminRoute } from './SuperAdminRoute';
import { SubscriptionGate } from '@components/subscription/SubscriptionGate';
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
const Subscription = lazy(() => import('@pages/Subscription'));
const NotFound = lazy(() => import('@pages/NotFound'));

const AdminDashboard = lazy(() => import('@pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@pages/admin/Users'));
const AdminUserDetail = lazy(() => import('@pages/admin/UserDetail'));
const AdminTrades = lazy(() => import('@pages/admin/Trades'));
const AdminLiveActivity = lazy(() => import('@pages/admin/LiveActivity'));
const AdminAnalytics = lazy(() => import('@pages/admin/Analytics'));
const AdminNotifications = lazy(() => import('@pages/admin/Notifications'));
const AdminSupport = lazy(() => import('@pages/admin/Support'));
const AdminLogs = lazy(() => import('@pages/admin/Logs'));
const AdminSettings = lazy(() => import('@pages/admin/Settings'));
const AdminSubscriptions = lazy(() => import('@pages/admin/Subscriptions'));

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
            <Route path={ROUTES.OPTION_CHAIN} element={<SubscriptionGate><OptionChain /></SubscriptionGate>} />
            <Route path={ROUTES.POSITIONS} element={<SubscriptionGate><Positions /></SubscriptionGate>} />
            <Route path={ROUTES.TRADE_HISTORY} element={<TradeHistory />} />
            <Route path={ROUTES.PERFORMANCE} element={<Performance />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.BROKER_INTEGRATION} element={<SubscriptionGate><BrokerIntegration /></SubscriptionGate>} />
            <Route path={ROUTES.KOTAK_NEO_INTEGRATION} element={<SubscriptionGate><KotakNeoIntegration /></SubscriptionGate>} />
            <Route path={ROUTES.SUBSCRIPTION} element={<Subscription />} />

            {/* Admin Panel — role-gated on top of ProtectedRoute's own auth check */}
            <Route element={<AdminRoute><Outlet /></AdminRoute>}>
              <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
              <Route path={ROUTES.ADMIN_USERS} element={<AdminUsers />} />
              <Route path={ROUTES.ADMIN_USER_DETAIL} element={<AdminUserDetail />} />
              <Route path={ROUTES.ADMIN_TRADES} element={<AdminTrades />} />
              <Route path={ROUTES.ADMIN_SUBSCRIPTIONS} element={<AdminSubscriptions />} />
              <Route path={ROUTES.ADMIN_LIVE_ACTIVITY} element={<AdminLiveActivity />} />
              <Route path={ROUTES.ADMIN_ANALYTICS} element={<AdminAnalytics />} />
              <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotifications />} />
              <Route path={ROUTES.ADMIN_SUPPORT} element={<AdminSupport />} />
              <Route path={ROUTES.ADMIN_LOGS} element={<AdminLogs />} />
              <Route
                path={ROUTES.ADMIN_SETTINGS}
                element={<SuperAdminRoute><AdminSettings /></SuperAdminRoute>}
              />
            </Route>
          </Route>

          {/* Fallbacks */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
