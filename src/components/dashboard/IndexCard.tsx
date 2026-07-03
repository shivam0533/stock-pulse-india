import { motion } from 'framer-motion';
import { MiniChart } from '@components/charts/MiniChart';
import { PriceChange } from '@components/common/PriceChange';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { MarketIndex } from '@/types';

interface IndexCardProps {
  index: MarketIndex;
  delay?: number;
}

export function IndexCard({ index, delay = 0 }: IndexCardProps) {
  const positive = index.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'relative overflow-hidden bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4',
        'hover:border-ink-500 transition-colors group'
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-ink-100 tracking-tight">
              {index.name}
            </h3>
            <div className="mt-2 font-mono text-2xl font-semibold text-ink-50 tabular-nums tracking-tight">
              {formatIndianNumber(index.value)}
            </div>
          </div>
          <div className={cn(
            'h-2 w-2 rounded-full mt-1.5 shrink-0',
            positive ? 'bg-gain' : 'bg-loss',
            'animate-pulse-dot'
          )} />
        </div>

        <div className="mt-1">
          <PriceChange
            change={index.change}
            changePercent={index.changePercent}
            showBoth
            size="xs"
          />
        </div>

        <div className="mt-3 -mx-1">
          <MiniChart data={index.history} positive={positive} height={44} />
        </div>
      </div>
    </motion.div>
  );
}
