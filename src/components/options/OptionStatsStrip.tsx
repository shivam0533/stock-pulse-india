import { Activity, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCompactNumber, formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { OptionChainData } from '@/types';

interface OptionStatsStripProps {
  data: OptionChainData;
}

function Stat({ label, value, icon: Icon, accent }: {
  label: string;
  value: string;
  icon: typeof Activity;
  accent?: 'gain' | 'loss' | 'brand' | 'neutral';
}) {
  const colors = {
    gain: 'text-gain',
    loss: 'text-loss',
    brand: 'text-brand-300',
    neutral: 'text-ink-100',
  };
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-r border-ink-600/40 last:border-r-0">
      <Icon size={14} className={colors[accent ?? 'neutral']} />
      <div>
        <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
        <div className={cn('font-mono text-sm font-semibold tabular-nums', colors[accent ?? 'neutral'])}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function OptionStatsStrip({ data }: OptionStatsStripProps) {
  const pcrPositive = data.pcr < 1;

  return (
    <div className="flex flex-wrap items-stretch bg-ink-800/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <Stat
        label="NIFTY Spot"
        value={`₹${formatIndianNumber(data.spotPrice, 2)}`}
        icon={Activity}
        accent="neutral"
      />
      <Stat
        label="PCR (OI)"
        value={data.pcr.toFixed(2)}
        icon={data.pcr >= 1 ? TrendingUp : TrendingDown}
        accent={data.pcr >= 1 ? 'gain' : 'loss'}
      />
      <Stat
        label="Max Pain"
        value={`₹${formatIndianNumber(data.maxPain, 0)}`}
        icon={Target}
        accent="brand"
      />
      <Stat
        label="Total Call OI"
        value={formatCompactNumber(data.totalCallOI)}
        icon={TrendingDown}
        accent="loss"
      />
      <Stat
        label="Total Put OI"
        value={formatCompactNumber(data.totalPutOI)}
        icon={TrendingUp}
        accent="gain"
      />
      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 min-w-[220px]">
        <div className="flex-1">
          <div className="flex justify-between text-2xs text-ink-300 mb-1">
            <span className="text-brand-300">CE OI</span>
            <span className="text-gain">PE OI</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-ink-700 flex">
            {(() => {
              const total = data.totalCallOI + data.totalPutOI;
              const callPct = total > 0 ? (data.totalCallOI / total) * 100 : 50;
              return (
                <>
                  <div className="h-full bg-brand-400/70 transition-all" style={{ width: `${callPct}%` }} />
                  <div className="h-full bg-gain/70 flex-1" />
                </>
              );
            })()}
          </div>
          <div className="flex justify-between text-2xs text-ink-300 mt-1">
            <span>{pcrPositive ? 'Bullish' : 'Bearish'} Sentiment</span>
            <span>PCR {data.pcr.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
