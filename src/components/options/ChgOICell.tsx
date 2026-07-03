import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatCompactNumber } from '@utils/format';
import { cn } from '@utils/cn';

interface ChgOICellProps {
  value: number;
  className?: string;
}

export function ChgOICell({ value, className }: ChgOICellProps) {
  const positive = value > 0;
  const zero = value === 0;

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums',
        zero ? 'text-ink-300' : positive ? 'text-gain' : 'text-loss',
        className,
      )}
    >
      {zero ? (
        <Minus size={10} />
      ) : positive ? (
        <ArrowUpRight size={10} />
      ) : (
        <ArrowDownRight size={10} />
      )}
      {!zero && (positive ? '+' : '')}{formatCompactNumber(Math.abs(value))}
    </div>
  );
}
