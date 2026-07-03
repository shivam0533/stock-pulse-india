import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { PriceChange } from '@components/common/PriceChange';
import { cn } from '@utils/cn';

type StatAccent = 'brand' | 'gain' | 'loss' | 'neutral';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: StatAccent;
  change?: number;
  changePercent?: number;
  caption?: string;
  delay?: number;
}

const accentClasses: Record<StatAccent, string> = {
  brand: 'bg-brand-400/15 text-brand-300',
  gain: 'bg-gain-subtle text-gain',
  loss: 'bg-loss-subtle text-loss',
  neutral: 'bg-ink-700 text-ink-200',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'brand',
  change,
  changePercent,
  caption,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'relative overflow-hidden bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl p-4',
        'hover:border-ink-500 transition-colors'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-2xs text-ink-300 uppercase tracking-wide">{label}</span>
          <div className="mt-2 font-mono text-lg lg:text-2xl font-semibold text-ink-50 tabular-nums tracking-tight truncate">
            {value}
          </div>
          {change !== undefined && changePercent !== undefined ? (
            <div className="mt-1.5">
              <PriceChange change={change} changePercent={changePercent} showBoth size="xs" />
            </div>
          ) : caption ? (
            <p className="mt-1.5 text-2xs text-ink-300 truncate">{caption}</p>
          ) : null}
        </div>
        <div className={cn('flex h-8 w-8 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-xl', accentClasses[accent])}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  );
}
