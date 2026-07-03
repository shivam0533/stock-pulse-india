import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { Button, Input } from '@components/ui';
import { authService } from '@services/auth.service';
import { ROUTES } from '@utils/constants';

const RESEND_COOLDOWN = 60;

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Something went wrong');
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
      <Link
        to={ROUTES.LOGIN}
        className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-ink-50 transition-colors mb-6"
      >
        <ArrowLeft size={13} /> Back to sign in
      </Link>

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-7">
              <h1 className="font-display text-3xl font-semibold text-ink-50 tracking-tight">
                Forgot password?
              </h1>
              <p className="mt-1.5 text-sm text-ink-200">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={15} />}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" loading={loading} fullWidth size="lg">
                Send reset link
              </Button>
            </form>
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
            <h1 className="font-display text-2xl font-semibold text-ink-50">Check your email</h1>
            <p className="mt-2 text-sm text-ink-200">
              We sent a reset link to{' '}
              <span className="text-ink-50 font-medium">{email}</span>
            </p>
            <p className="mt-1 text-xs text-ink-300">
              The link expires in 30 minutes. Check your spam folder if it doesn't arrive.
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss text-left">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              className="mt-6 flex items-center gap-1.5 mx-auto text-sm font-medium text-brand-300 hover:text-brand-200 disabled:text-ink-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend email'}
            </button>

            <div className="mt-6 pt-6 border-t border-ink-600/40">
              <Link to={ROUTES.LOGIN} className="text-sm text-ink-300 hover:text-ink-50 transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
