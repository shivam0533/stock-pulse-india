import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercent, formatSignedChange } from '@utils/format';
import { cn } from '@utils/cn';

interface PriceChangeProps {
  change: number;
  changePercent: number;
  showArrow?: boolean;
  showBoth?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'text-2xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const arrowSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
};

export function PriceChange({
  change,
  changePercent,
  showArrow = true,
  showBoth = false,
  size = 'sm',
  className,
}: PriceChangeProps) {
  const isPositive = change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-gain' : 'text-loss';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums font-mono',
        color,
        sizeClasses[size],
        className
      )}
    >
      {showArrow && <Icon size={arrowSize[size]} strokeWidth={2.5} />}
      {showBoth && <span>{formatSignedChange(change)}</span>}
      <span>({formatPercent(changePercent)})</span>
    </span>
  );
}
