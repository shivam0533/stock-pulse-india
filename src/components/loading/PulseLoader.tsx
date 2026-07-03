import { cn } from '@utils/cn';

interface PulseLoaderProps {
  className?: string;
  label?: string;
}

export function PulseLoader({ className, label }: PulseLoaderProps) {
  return (
    <div className={cn('flex items-center gap-2 text-ink-200 text-sm', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
