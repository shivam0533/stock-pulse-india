import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightSlot, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-ink-200 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'relative flex items-center bg-ink-800 border rounded-xl transition-colors',
            'focus-within:border-brand-400 focus-within:bg-ink-800',
            error ? 'border-loss/50' : 'border-ink-600 hover:border-ink-500'
          )}
        >
          {leftIcon && (
            <div className="pl-3.5 text-ink-200 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent text-ink-50 placeholder:text-ink-300 outline-none',
              'h-11 px-3.5 text-sm',
              leftIcon && 'pl-2',
              rightSlot && 'pr-2',
              className
            )}
            {...rest}
          />
          {rightSlot && <div className="pr-2">{rightSlot}</div>}
        </div>
        {(error || hint) && (
          <p className={cn('text-xs', error ? 'text-loss' : 'text-ink-300')}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
