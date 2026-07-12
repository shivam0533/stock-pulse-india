import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, ImagePlus, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, Badge, Button, Input } from '@components/ui';
import { subscriptionService } from '@services/subscription.service';
import { useAuthStore } from '@store/auth.store';
import { resizeImageToBase64 } from '@utils/imageResize';
import { getLockedMessage } from '@utils/subscriptionMessages';
import { formatDate } from '@utils/format';
import { cn } from '@utils/cn';
import type { SubscriptionPlan, SubscriptionStatusResponse } from '@/types';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

function QrCodeImage() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-48 h-48 rounded-xl border-2 border-dashed border-ink-500 bg-ink-800 flex flex-col items-center justify-center text-center px-4 gap-1.5">
        <ImagePlus size={22} className="text-ink-400" />
        <p className="text-2xs text-ink-300 leading-snug">
          Drop your PhonePe QR image at <code className="text-ink-200">public/phonepe-qr.png</code>
        </p>
      </div>
    );
  }
  return (
    <img
      src="/phonepe-qr.png"
      alt="PhonePe QR code"
      onError={() => setFailed(true)}
      className="w-48 h-48 rounded-xl border border-ink-600 object-contain bg-white p-2"
    />
  );
}

function PlanGrid({ plans, selectedPlanId, onSelect }: { plans: SubscriptionPlan[]; selectedPlanId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => onSelect(plan.id)}
          className={cn(
            'rounded-xl border p-4 text-left transition-colors',
            selectedPlanId === plan.id ? 'border-brand-400 bg-brand-400/10' : 'border-ink-600 hover:border-ink-500'
          )}
        >
          <p className="text-xs uppercase tracking-wide text-ink-300">{plan.label}</p>
          <p className="font-display text-xl font-bold text-ink-50 mt-1">₹{plan.priceInr.toLocaleString('en-IN')}</p>
          <p className="text-2xs text-ink-400 mt-0.5">{plan.durationDays} days</p>
        </button>
      ))}
    </div>
  );
}

export default function Subscription() {
  const [status, setStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // The QR code must only ever appear after this is explicitly true — never
  // rendered as part of the page's default/initial view.
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const load = () => {
    setLoading(true);
    subscriptionService.getStatus()
      .then((res) => {
        setStatus(res);
        setSelectedPlanId((current) => current ?? res.plans[0]?.id ?? null);
        // Keeps SubscriptionGate (Option Chain/Positions/Broker pages) from
        // showing a stale locked state — this page is where a user most
        // naturally checks "did my payment get approved," so sync here too.
        useAuthStore.setState((s) => (s.user ? {
          user: {
            ...s.user,
            isTradingLocked: res.isTradingLocked,
            subscriptionStatus: res.subscriptionStatus,
            trialEndDate: res.trialEndDate,
            subscriptionEndDate: res.subscriptionEndDate,
          },
        } : {}));
      })
      .catch((err) => setError(err.message ?? 'Failed to load subscription status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageToBase64(file);
      setScreenshotBase64(base64);
      setScreenshotFileName(file.name);
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Could not process the selected image.');
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!selectedPlanId) {
      setSubmitError('Please select a plan.');
      return;
    }
    if (!utr.trim()) {
      setSubmitError('UTR / Transaction ID is required.');
      return;
    }
    setSubmitting(true);
    try {
      await subscriptionService.submitPaymentRequest({ planId: selectedPlanId, utr: utr.trim(), screenshot: screenshotBase64 });
      setSubmitted(true);
      setUtr('');
      setScreenshotBase64(null);
      setScreenshotFileName(null);
      setShowPaymentForm(false);
      load();
    } catch (err) {
      setSubmitError((err as { message?: string }).message ?? 'Failed to submit payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-ink-300">Loading…</p>;
  if (error || !status) return <p className="text-sm text-loss">{error ?? 'Failed to load subscription status'}</p>;

  const pendingRequest = status.paymentRequests.find((r) => r.status === 'PENDING');
  const activeUntil = status.subscriptionStatus === 'ACTIVE' ? status.subscriptionEndDate : null;
  const trialRemainingMs = status.subscriptionStatus === 'TRIAL' && status.trialEndDate ? status.trialEndDate - now : null;
  const selectedPlan = status.plans.find((p) => p.id === selectedPlanId) ?? status.plans[0];
  const cheapestPlan = status.plans[0];

  return (
    <div className="space-y-5 max-w-[720px] mx-auto">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-50">Subscription</h1>
        <p className="text-sm text-ink-300 mt-0.5">Your trial, billing status, and payment history.</p>
      </div>

      {/* Status card */}
      <Card className="p-5">
        {status.subscriptionStatus === 'TRIAL' && !status.isTradingLocked && (
          <div>
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-brand-300 shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink-50">Free trial active</p>
                <p className="text-xs text-ink-300 mt-0.5">
                  {trialRemainingMs !== null ? formatCountdown(trialRemainingMs) : '—'} · ends {status.trialEndDate ? formatDate(status.trialEndDate) : '—'}
                </p>
              </div>
            </div>
            {!pendingRequest && !showPaymentForm && (
              <div className="mt-3 pt-3 border-t border-ink-600/30">
                <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(true)}>
                  View Plans
                </Button>
              </div>
            )}
          </div>
        )}
        {status.subscriptionStatus === 'ACTIVE' && !status.isTradingLocked && (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-gain shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink-50">Subscription active</p>
              <p className="text-xs text-ink-300 mt-0.5">Valid until {activeUntil ? formatDate(activeUntil) : '—'}</p>
            </div>
          </div>
        )}
        {status.isTradingLocked && (
          <div className="text-center py-4">
            <ShieldAlert size={28} className="text-loss mx-auto mb-3" />
            <p className="text-base font-semibold text-ink-50">{getLockedMessage(status.subscriptionStatus)}</p>
            <p className="text-sm text-ink-300 mt-1">Choose a plan to continue trading.</p>
            {cheapestPlan && (
              <p className="font-display text-2xl font-bold text-brand-300 mt-3">
                From ₹{cheapestPlan.priceInr.toLocaleString('en-IN')} <span className="text-sm font-normal text-ink-300">/ {cheapestPlan.label}</span>
              </p>
            )}
            {!pendingRequest && !showPaymentForm && (
              <Button className="mt-4" onClick={() => setShowPaymentForm(true)}>
                View Plans
              </Button>
            )}
          </div>
        )}
        {status.subscriptionStatus === 'ACTIVE' && !status.isTradingLocked && !pendingRequest && !showPaymentForm && (
          <div className="mt-3 pt-3 border-t border-ink-600/30">
            <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(true)}>
              Renew / Upgrade Plan
            </Button>
          </div>
        )}
      </Card>

      {/* Pending request banner */}
      {pendingRequest && (
        <Card className="p-4 flex items-center gap-3 border-brand-400/30 bg-brand-400/5">
          <Clock size={18} className="text-brand-300 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-ink-50">Your payment request is under review.</p>
            <p className="text-xs text-ink-300 mt-0.5">
              UTR {pendingRequest.utr} · ₹{pendingRequest.amountInr.toLocaleString('en-IN')} · submitted {formatDate(pendingRequest.createdAt)}
            </p>
          </div>
          <Badge variant="amber">Pending</Badge>
        </Card>
      )}

      {/* Payment form — QR is only ever rendered inside this block, and only once the user has explicitly clicked "View Plans" above */}
      {!pendingRequest && showPaymentForm && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-ink-200" />
            <h2 className="font-display text-sm font-semibold text-ink-50">
              {status.subscriptionStatus === 'ACTIVE' ? 'Renew early' : 'Choose a plan'}
            </h2>
          </div>

          <PlanGrid plans={status.plans} selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} />

          <div className="flex flex-col sm:flex-row gap-5 pt-2 border-t border-ink-600/30">
            <QrCodeImage />
            <div className="flex-1 space-y-3">
              <p className="text-xs text-ink-300">
                Scan the QR and pay <b className="text-ink-50">₹{selectedPlan ? selectedPlan.priceInr.toLocaleString('en-IN') : '—'}</b> for the{' '}
                <b className="text-ink-50">{selectedPlan?.label ?? '—'}</b> plan, then enter the UTR / Transaction ID from your payment below.
                An admin will review and activate your subscription.
              </p>
              <Input
                label="UTR / Transaction ID"
                placeholder="e.g. 402512345678"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink-200 uppercase tracking-wide">
                  Payment screenshot <span className="normal-case text-ink-400">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className={cn(
                    'block w-full text-xs text-ink-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0',
                    'file:bg-ink-700 file:text-ink-100 file:text-xs hover:file:bg-ink-600 file:cursor-pointer cursor-pointer'
                  )}
                />
                {screenshotFileName && <p className="text-2xs text-gain">Attached: {screenshotFileName}</p>}
              </div>
              {submitError && <p className="text-xs text-loss">{submitError}</p>}
              {submitted && <p className="text-xs text-gain">Payment request submitted — awaiting admin review.</p>}
              <Button onClick={handleSubmit} loading={submitting} fullWidth>
                Submit Payment Request
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      {status.paymentRequests.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-ink-50 mb-3">Payment history</h2>
          <div className="space-y-2">
            {status.paymentRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-ink-600/30 last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="text-ink-100">UTR {r.utr} · ₹{r.amountInr.toLocaleString('en-IN')}</p>
                  <p className="text-2xs text-ink-400">{formatDate(r.createdAt)}</p>
                </div>
                <Badge variant={r.status === 'APPROVED' ? 'gain' : r.status === 'REJECTED' ? 'loss' : 'amber'}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
