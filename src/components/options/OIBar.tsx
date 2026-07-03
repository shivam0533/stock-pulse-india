import { formatCompactNumber } from '@utils/format';
import { cn } from '@utils/cn';

interface OIBarProps {
  value: number;
  maxValue: number;
  side: 'call' | 'put';
  className?: string;
}

/** OI number with a proportional background bar — standard option-chain visual. */
export function OIBar({ value, maxValue, side, className }: OIBarProps) {
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

  return (
    <div className={cn('relative flex items-center justify-end', className)}>
      {/* Background bar */}
      <div
        className={cn(
          'absolute inset-y-0 rounded-sm opacity-25',
          side === 'call' ? 'bg-brand-400 right-0' : 'bg-gain left-0',
        )}
        style={{ width: `${pct}%` }}
      />
      <span className="relative font-mono text-xs text-ink-100 tabular-nums">
        {formatCompactNumber(value)}
      </span>
    </div>
  );
}
