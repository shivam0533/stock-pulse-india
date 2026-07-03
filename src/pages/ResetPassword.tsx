import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@components/ui';
import { PasswordInput } from '@components/auth/PasswordInput';
import { PasswordStrengthBar } from '@components/auth/PasswordStrengthBar';
import { authService } from '@services/auth.service';
import { ROUTES } from '@utils/constants';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // In production: token comes from URL ?token=xxx  (email link)
  // In mock: we use a demo token so any value works
  const token = params.get('token') ?? 'demo-reset-token';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [countdown, setCountdown] = useState(0);

  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    if (!success) return;
    setCountdown(5);
  }, [success]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { navigate(ROUTES.LOGIN, { replace: true }); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-7">
              <div className="h-12 w-12 rounded-2xl bg-brand-400/15 border border-brand-400/30 flex items-center justify-center mb-4">
                <Lock size={22} className="text-brand-300" />
              </div>
              <h1 className="font-display text-3xl font-semibold text-ink-50 tracking-tight">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-ink-200">
                Choose a strong new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <PasswordInput
                  label="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoFocus
                  autoComplete="new-password"
                />
                {password && <PasswordStrengthBar password={password} />}
              </div>

              <div className="space-y-1.5">
                <PasswordInput
                  label="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  autoComplete="new-password"
                  error={mismatch ? 'Passwords do not match' : undefined}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={!password || !confirm || mismatch}
                fullWidth
                size="lg"
              >
                Set new password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to={ROUTES.LOGIN} className="text-xs text-ink-300 hover:text-ink-50 transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-gain-subtle border border-gain/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-gain" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">Password updated!</h1>
            <p className="mt-2 text-sm text-ink-200">
              Your password has been changed successfully.
            </p>
            <p className="mt-1 text-xs text-ink-300">
              Redirecting to sign in in {countdown}s…
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate(ROUTES.LOGIN)} size="sm">
                Sign in now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
