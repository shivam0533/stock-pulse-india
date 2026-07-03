import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Mail, Phone, User } from 'lucide-react';
import { Button, Input } from '@components/ui';
import { PasswordInput } from '@components/auth/PasswordInput';
import { PasswordStrengthBar } from '@components/auth/PasswordStrengthBar';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@utils/constants';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, status, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [agreed, setAgreed] = useState(false);

  const isLoading = status === 'loading';
  const patch = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signup(form);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch { /* handled by store */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-7">
        <h1 className="font-display text-3xl font-semibold text-ink-50 tracking-tight">
          Open your account
        </h1>
        <p className="mt-1.5 text-sm text-ink-200">
          Takes 2 minutes. KYC verification follows on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          name="name"
          value={form.name}
          onChange={patch('name')}
          leftIcon={<User size={15} />}
          placeholder="As per PAN"
          required
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={patch('email')}
          leftIcon={<Mail size={15} />}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Input
          label="Phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={patch('phone')}
          leftIcon={<Phone size={15} />}
          placeholder="+91 98765 43210"
          required
          autoComplete="tel"
        />

        <div className="space-y-1.5">
          <PasswordInput
            label="Password"
            name="password"
            value={form.password}
            onChange={patch('password')}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
          />
          {form.password && <PasswordStrengthBar password={form.password} />}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="mt-0.5 h-3.5 w-3.5 rounded border-ink-600 bg-ink-800 text-brand-400 focus:ring-brand-400 focus:ring-offset-ink-900"
          />
          <span className="text-xs text-ink-300 leading-relaxed">
            I agree to the{' '}
            <a href="#" className="text-ink-100 hover:text-brand-300 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-ink-100 hover:text-brand-300 transition-colors">Privacy Policy</a>.
            All investments are subject to market risk.
          </span>
        </label>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" loading={isLoading} disabled={!agreed} fullWidth size="lg">
          Create account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-200">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}
