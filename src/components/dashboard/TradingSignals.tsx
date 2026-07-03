import { Radar } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '@components/ui';
import { useTradingSignals } from '@hooks/useDashboard';
import { formatIndianNumber, formatRelativeTime } from '@utils/format';
import type { SignalAction } from '@/types';

const ACTION_VARIANT: Record<SignalAction, 'gain' | 'loss' | 'neutral'> = {
  BUY: 'gain',
  SELL: 'loss',
  HOLD: 'neutral',
};

export function TradingSignals() {
  const { data, isLoading } = useTradingSignals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar size={16} className="text-brand-300" />
          Recent Trading Signals
        </CardTitle>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">AI Generated</span>
      </CardHeader>
      <div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : data?.map((signal) => (
              <div
                key={signal.id}
                className="px-5 py-3.5 border-b border-ink-600/30 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={ACTION_VARIANT[signal.action]}>{signal.action}</Badge>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold text-ink-50">{signal.symbol}</div>
                      <div className="text-2xs text-ink-300">{signal.strength} · {formatRelativeTime(signal.generatedAt)}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-ink-50 tabular-nums">
                      ₹{formatIndianNumber(signal.targetPrice)}
                    </div>
                    <div className="text-2xs text-brand-300 font-mono tabular-nums">
                      {signal.confidence}% confidence
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-ink-200 leading-snug text-balance">{signal.reason}</p>
              </div>
            ))}
      </div>
    </Card>
  );
}
