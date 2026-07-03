import { Brain, TrendingDown, TrendingUp, Minus, Zap } from 'lucide-react';
import { cn } from '@utils/cn';
import type { DetailedSignal } from '@/types';

interface SignalStatsProps {
  signals: DetailedSignal[];
}

function StatBox({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof Zap; color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-r border-ink-600/40 last:border-r-0 flex-1">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div>
        <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
        <div className="font-mono text-lg font-bold text-ink-50 tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

export function SignalStats({ signals }: SignalStatsProps) {
  const buys = signals.filter((s) => s.action === 'BUY').length;
  const sells = signals.filter((s) => s.action === 'SELL').length;
  const holds = signals.filter((s) => s.action === 'HOLD').length;
  const avgConf = signals.length
    ? Math.round(signals.reduce((a, s) => a + s.confidence, 0) / signals.length)
    : 0;
  const highConf = signals.filter((s) => s.confidence >= 75).length;

  return (
    <div className="flex flex-wrap bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl overflow-hidden">
      <StatBox label="Total Signals" value={signals.length} icon={Zap} color="bg-brand-400/15 text-brand-300" />
      <StatBox label="BUY Signals" value={buys} icon={TrendingUp} color="bg-gain-subtle text-gain" />
      <StatBox label="SELL Signals" value={sells} icon={TrendingDown} color="bg-loss-subtle text-loss" />
      <StatBox label="HOLD Signals" value={holds} icon={Minus} color="bg-ink-700 text-ink-200" />
      <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-[180px]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-400/15 text-brand-300">
          <Brain size={16} />
        </div>
        <div className="flex-1">
          <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">
            Avg Confidence · <span className="text-gain">{highConf} high-conf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-ink-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-400 transition-all"
                style={{ width: `${avgConf}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold text-brand-300 tabular-nums">{avgConf}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
