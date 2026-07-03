import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Mail } from 'lucide-react';
import { Button, Input } from '@components/ui';
import { PasswordInput } from '@components/auth/PasswordInput';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@utils/constants';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status, error, clearError } = useAuthStore();
  const [email, setEmail]       = useState('arjun@stockpulse.in');
  const [password, setPassword] = useState('demo1234');
  const [rememberMe, setRememberMe] = useState(true);

  const isLoading = status === 'loading';
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch {
      // error set in store
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-7">
        <h1 className="font-display text-3xl font-semibold text-ink-50 tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-ink-200">
          Sign in to track your portfolio and watchlist.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={15} />}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-800 text-brand-400 focus:ring-brand-400 focus:ring-offset-ink-900"
            />
            <span className="text-xs text-ink-200">Keep me signed in</span>
          </label>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs text-brand-300 hover:text-brand-200 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" loading={isLoading} fullWidth size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-200">
        New to Stock Pulse?{' '}
        <Link to={ROUTES.SIGNUP} className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
          Create an account
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-ink-600/40">
        <p className="text-2xs text-ink-300 text-center">
          Demo credentials are pre-filled. Press <span className="text-ink-100">Sign in</span> to explore.
        </p>
      </div>
    </motion.div>
  );
}
