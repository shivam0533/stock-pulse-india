import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { useState } from 'react';
import { cn } from '@utils/cn';
import type { TradeDistItem } from '@/types';

interface TradeDistributionChartProps {
  data: TradeDistItem[];
  totalTrades: number;
  height?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

interface TTPayload {
  active?: boolean;
  payload?: Array<{ payload: TradeDistItem }>;
}

function DistTooltip({ active, payload }: TTPayload) {
  if (!active || !payload?.[0]) return null;
  const { bucket, count, pct } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 shadow-2xl space-y-1.5 min-w-[140px]">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{bucket}</div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Trades</span>
        <span className="font-mono text-sm text-ink-50 font-semibold tabular-nums">{count}</span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Share</span>
        <span className="font-mono text-xs text-brand-300 tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

export function TradeDistributionChart({ data, totalTrades, height = 280 }: TradeDistributionChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      {/* Donut */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="bucket"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
              activeIndex={activeIdx}
              activeShape={ActiveShape}
              onMouseEnter={(_, idx) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(undefined)}
              isAnimationActive
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.bucket} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DistTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-ink-50 tabular-nums">{totalTrades}</span>
          <span className="text-2xs text-ink-300 uppercase tracking-wide">Trades</span>
        </div>
      </div>

      {/* Legend table */}
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.bucket} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-ink-200 truncate">{item.bucket}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs text-ink-300 tabular-nums">{item.count}</span>
              <div className="w-16 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
              <span
                className={cn('font-mono text-xs tabular-nums w-10 text-right')}
                style={{ color: item.color }}
              >
                {item.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
