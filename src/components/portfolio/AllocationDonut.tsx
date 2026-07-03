import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { formatINR } from '@utils/format';
import { cn } from '@utils/cn';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  pct: number;
  sub?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

interface TTPayload { active?: boolean; payload?: Array<{ payload: DonutSlice }>; }

function ChartTooltip({ active, payload }: TTPayload) {
  if (!active || !payload?.[0]) return null;
  const { name, value, pct, sub } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 shadow-2xl min-w-[140px] space-y-1">
      <div className="text-xs font-semibold text-ink-50">{name}</div>
      {sub && <div className="text-2xs text-ink-400">{sub}</div>}
      <div className="flex justify-between gap-4 text-xs">
        <span className="text-ink-300">Value</span>
        <span className="font-mono text-ink-50 tabular-nums">{formatINR(value, { compact: true })}</span>
      </div>
      <div className="flex justify-between gap-4 text-xs">
        <span className="text-ink-300">Share</span>
        <span className="font-mono text-brand-300 tabular-nums font-semibold">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

interface AllocationDonutProps {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  showLegend?: boolean;
}

export function AllocationDonut({
  data,
  centerLabel = 'Total',
  centerValue,
  height = 260,
  showLegend = true,
}: AllocationDonutProps) {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
              activeIndex={activeIdx}
              activeShape={ActiveShape}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(undefined)}
              isAnimationActive
              animationBegin={0}
              animationDuration={1100}
              animationEasing="ease-out"
            >
              {data.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {centerValue && (
            <span className="font-mono text-lg font-bold text-ink-50 tabular-nums leading-tight">
              {centerValue}
            </span>
          )}
          <span className="text-2xs text-ink-300 uppercase tracking-wide">{centerLabel}</span>
        </div>
      </div>

      {showLegend && (
        <div className="space-y-2">
          {data.map((s, i) => (
            <div
              key={s.name}
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors cursor-default',
                activeIdx === i ? 'bg-ink-700/50' : 'hover:bg-ink-700/30',
              )}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(undefined)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-ink-200 flex-1 truncate">{s.name}</span>
              <span className="font-mono text-xs text-ink-300 tabular-nums">
                {formatINR(s.value, { compact: true })}
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                {s.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
