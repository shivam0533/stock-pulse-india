import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@utils/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card',
        className
      )}
      {...rest}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-4 flex items-center justify-between border-b border-ink-600/40', className)}
      {...rest}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...rest }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-display text-base font-semibold text-ink-50 tracking-tight',
        className
      )}
      {...rest}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...rest} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-3 border-t border-ink-600/40', className)}
      {...rest}
    />
  )
);
CardFooter.displayName = 'CardFooter';
