import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, Button } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import { subscriptionService } from '@services/subscription.service';
import { getLockedMessage } from '@utils/subscriptionMessages';
import { ROUTES } from '@utils/constants';
import type { SubscriptionStatus } from '@/types';

const MONTHLY_PRICE_INR = 5999;

interface SubscriptionGateProps {
  children: ReactNode;
}

/**
 * Wraps trading-only pages (Option Chain, Positions, Broker Integration).
 * Pure UX — the real enforcement is server-side (requireActiveSubscription
 * on the broker/nifty route files); this just avoids the user clicking
 * around a page whose every API call would 403 anyway.
 *
 * Re-checks status on mount rather than trusting only the auth store's
 * isTradingLocked (set at login/signup time): an admin approving a payment
 * mid-session must unlock these pages immediately, not after the user logs
 * out and back in.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const storeUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [locked, setLocked] = useState(storeUser?.isTradingLocked ?? false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | undefined>(storeUser?.subscriptionStatus);

  useEffect(() => {
    let cancelled = false;
    subscriptionService.getStatus().then((status) => {
      if (cancelled) return;
      setLocked(status.isTradingLocked);
      setSubscriptionStatus(status.subscriptionStatus);
      // Keep the rest of the app (this same check on other pages, the
      // sidebar, etc.) in sync too, instead of only this one component.
      useAuthStore.setState((s) => (s.user ? {
        user: {
          ...s.user,
          isTradingLocked: status.isTradingLocked,
          subscriptionStatus: status.subscriptionStatus,
          trialEndDate: status.trialEndDate,
          subscriptionEndDate: status.subscriptionEndDate,
        },
      } : {}));
    }).catch(() => {
      // Network hiccup — fall back to whatever the store already had rather
      // than blocking the page on a failed background check.
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!locked) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card className="p-8 text-center">
        <ShieldAlert size={32} className="text-loss mx-auto mb-4" />
        <p className="text-base font-semibold text-ink-50">{getLockedMessage(subscriptionStatus ?? 'TRIAL')}</p>
        <p className="text-sm text-ink-300 mt-1">Purchase a Monthly Plan to continue trading.</p>
        <p className="font-display text-2xl font-bold text-brand-300 mt-4">
          ₹{MONTHLY_PRICE_INR.toLocaleString('en-IN')} <span className="text-sm font-normal text-ink-300">/ Month</span>
        </p>
        <Button className="mt-5" fullWidth onClick={() => navigate(ROUTES.SUBSCRIPTION)}>
          Go to Subscription
        </Button>
      </Card>
    </div>
  );
}
