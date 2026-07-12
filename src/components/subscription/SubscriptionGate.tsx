import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, Button } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import { subscriptionService } from '@services/subscription.service';
import { getLockedMessage } from '@utils/subscriptionMessages';
import { ROUTES } from '@utils/constants';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types';

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    subscriptionService.getStatus().then((status) => {
      if (cancelled) return;
      setLocked(status.isTradingLocked);
      setSubscriptionStatus(status.subscriptionStatus);
      setPlans(status.plans);
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
        <p className="text-base font-semibold text-ink-50">{getLockedMessage(subscriptionStatus ?? 'EXPIRED')}</p>
        <p className="text-sm text-ink-300 mt-1">Choose a plan to continue trading.</p>
        {plans.length > 0 && (
          <div className="flex flex-col gap-1 mt-4">
            {plans.map((plan) => (
              <p key={plan.id} className="text-sm text-ink-200">
                {plan.label}: <span className="font-display font-bold text-brand-300">₹{plan.priceInr.toLocaleString('en-IN')}</span>
              </p>
            ))}
          </div>
        )}
        <Button className="mt-5" fullWidth onClick={() => navigate(ROUTES.SUBSCRIPTION)}>
          Go to Subscription
        </Button>
      </Card>
    </div>
  );
}
