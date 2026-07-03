import { cn } from '@utils/cn';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow-amber">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M2 12 L7 12 L9.5 5 L11.5 17 L14 8 L16 12 L20 12"
            stroke="#0A0E1A"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-semibold text-ink-50 tracking-tight">
            Stock Pulse
          </span>
          <span className="text-[10px] text-ink-300 uppercase tracking-[0.18em] font-medium">
            India
          </span>
        </div>
      )}
    </div>
  );
}
