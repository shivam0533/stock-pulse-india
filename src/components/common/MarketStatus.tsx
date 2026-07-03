import { useEffect, useState } from 'react';
import { getMarketStatus } from '@utils/market';
import { cn } from '@utils/cn';

const STATUS_CONFIG = {
  open: {
    label: 'Markets Open',
    dot: 'bg-gain',
    text: 'text-gain',
    border: 'border-gain-border bg-gain-subtle',
    pulse: true,
  },
  'pre-open': {
    label: 'Pre-Open',
    dot: 'bg-brand-400',
    text: 'text-brand-300',
    border: 'border-brand-400/30 bg-brand-400/10',
    pulse: true,
  },
  closed: {
    label: 'Markets Closed',
    dot: 'bg-ink-300',
    text: 'text-ink-200',
    border: 'border-ink-600 bg-ink-700/50',
    pulse: false,
  },
} as const;

interface MarketStatusProps {
  className?: string;
  compact?: boolean;
}

export function MarketStatus({ className, compact = false }: MarketStatusProps) {
  const [status, setStatus] = useState(getMarketStatus());

  useEffect(() => {
    const interval = setInterval(() => setStatus(getMarketStatus()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full border',
        config.border,
        className
      )}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', config.dot)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dot)} />
      </span>
      {!compact && (
        <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
      )}
    </div>
  );
}
