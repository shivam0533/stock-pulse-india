import type { HTMLAttributes } from 'react';
import { cn } from '@utils/cn';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton rounded-md bg-ink-700/50', className)}
      aria-hidden
      {...rest}
    />
  );
}
