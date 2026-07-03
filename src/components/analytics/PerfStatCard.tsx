import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@hooks/useCountUp';
import { cn } from '@utils/cn';

export type CardAccent = 'gain' | 'loss' | 'brand' | 'purple' | 'cyan' | 'neutral';

const ACCENT = {
  gain:    { bg: 'bg-gain-subtle',      border: 'border-gain/30',       icon: 'text-gain',      glow: 'shadow-glow-gain',  bar: 'bg-gain'      },
  loss:    { bg: 'bg-loss-subtle',      border: 'border-loss/30',       icon: 'text-loss',      glow: 'shadow-glow-loss',  bar: 'bg-loss'      },
  brand:   { bg: 'bg-brand-400/10',     border: 'border-brand-400/30',  icon: 'text-brand-300', glow: 'shadow-glow-amber', bar: 'bg-brand-400' },
  purple:  { bg: 'bg-purple-500/10',    border: 'border-purple-500/25', icon: 'text-purple-400', glow: '',                  bar: 'bg-purple-500' },
  cyan:    { bg: 'bg-cyan-500/10',      border: 'border-cyan-500/25',   icon: 'text-cyan-400',   glow: '',                  bar: 'bg-cyan-500'  },
  neutral: { bg: 'bg-ink-700/40',       border: 'border-ink-600/60',    icon: 'text-ink-300',    glow: '',                  bar: 'bg-ink-500'   },
} as const;

interface PerfStatCardProps {
  label: string;
  rawValue: number;
  formattedValue?: string;   // overrides count-up display if provided
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: CardAccent;
  icon: LucideIcon;
  sub?: string;
  trend?: number;             // positive = good, negative = bad (shows arrow + %)
  delay?: number;
  animKey?: string;
}

export function PerfStatCard({
  label,
  rawValue,
  formattedValue,
  prefix = '',
  suffix = '',
  decimals = 0,
  accent,
  icon: Icon,
  sub,
  trend,
  delay = 0,
  animKey,
}: PerfStatCardProps) {
  const animated = useCountUp(rawValue, 1200, animKey);
  const cfg = ACCENT[accent];

  const displayValue = formattedValue ?? `${prefix}${animated.toFixed(decimals)}${suffix}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.18 } }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 flex flex-col gap-3',
        'bg-ink-800/60 backdrop-blur-sm cursor-default',
        cfg.border,
      )}
    >
      {/* Ambient corner glow */}
      <div className={cn(
        'absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-60 pointer-events-none',
        cfg.bg,
      )} />

      {/* Header: icon + label */}
      <div className="flex items-center justify-between gap-2 relative">
        <span className="text-2xs text-ink-300 uppercase tracking-widest font-medium">{label}</span>
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', cfg.bg)}>
          <Icon size={14} strokeWidth={2.4} className={cfg.icon} />
        </div>
      </div>

      {/* Animated value */}
      <div className="relative">
        <motion.div
          key={animKey}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.1 }}
          className="font-mono text-2xl font-bold text-ink-50 tabular-nums leading-none tracking-tight"
        >
          {displayValue}
        </motion.div>

        {/* Trend indicator */}
        {trend !== undefined && (
          <span className={cn(
            'ml-2 align-baseline font-mono text-xs font-semibold tabular-nums',
            trend >= 0 ? 'text-gain' : 'text-loss',
          )}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Sub label */}
      {sub && (
        <p className="text-2xs text-ink-400 leading-snug relative">{sub}</p>
      )}

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
        <motion.div
          className={cn('h-full', cfg.bar)}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
