import { CheckCircle2, Minus, XCircle } from 'lucide-react';
import { cn } from '@utils/cn';
import type { SignalIndicator } from '@/types';

const STATUS_CONFIG = {
  bullish: {
    icon: CheckCircle2,
    classes: 'bg-gain-subtle text-gain border-gain-border',
  },
  bearish: {
    icon: XCircle,
    classes: 'bg-loss-subtle text-loss border-loss-border',
  },
  neutral: {
    icon: Minus,
    classes: 'bg-ink-700/60 text-ink-300 border-ink-600',
  },
} as const;

interface IndicatorPillsProps {
  indicators: SignalIndicator[];
}

export function IndicatorPills({ indicators }: IndicatorPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {indicators.map((ind) => {
        const { icon: Icon, classes } = STATUS_CONFIG[ind.status];
        return (
          <span
            key={ind.name}
            title={ind.value}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-medium',
              classes,
            )}
          >
            <Icon size={10} />
            {ind.name}
          </span>
        );
      })}
    </div>
  );
}
