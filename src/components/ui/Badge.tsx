import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@utils/cn';

type BadgeVariant = 'default' | 'gain' | 'loss' | 'neutral' | 'amber';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-ink-700 text-ink-100 border-ink-600',
  gain: 'bg-gain-subtle text-gain border-gain-border',
  loss: 'bg-loss-subtle text-loss border-loss-border',
  neutral: 'bg-ink-700 text-ink-200 border-ink-600',
  amber: 'bg-brand-400/15 text-brand-300 border-brand-400/30',
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
        'text-2xs font-medium border tabular-nums',
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
