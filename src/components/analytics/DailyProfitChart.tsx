import {
  CartesianGrid, Cell, Line, ComposedChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar,
} from 'recharts';
import { formatINR } from '@utils/format';
import type { DailyPoint } from '@/types';

interface DailyProfitChartProps {
  data: DailyPoint[];
  height?: number;
}

interface TTPayload {
  active?: boolean;
  payload?: Array<{ payload: DailyPoint }>;
}

function DailyTooltip({ active, payload }: TTPayload) {
  if (!active || !payload?.[0]) return null;
  const { label, profit, cumulative } = payload[0].payload;
  const pos = profit >= 0;
  const cumPos = cumulative >= 0;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 shadow-2xl space-y-1.5 min-w-[160px]">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Daily</span>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pos ? 'text-gain' : 'text-loss'}`}>
          {pos ? '+' : ''}{formatINR(profit, { compact: true })}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Cumulative</span>
        <span className={`font-mono text-xs tabular-nums ${cumPos ? 'text-brand-300' : 'text-loss'}`}>
          {cumPos ? '+' : ''}{formatINR(cumulative, { compact: true })}
        </span>
      </div>
    </div>
  );
}

export function DailyProfitChart({ data, height = 260 }: DailyProfitChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke="#1A2138" strokeDasharray="3 3" vertical={false} opacity={0.8} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          minTickGap={18}
        />
        <YAxis
          yAxisId="bar"
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <YAxis
          yAxisId="line"
          orientation="right"
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <Tooltip content={<DailyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine yAxisId="bar" y={0} stroke="#6B7599" strokeOpacity={0.4} />
        <Bar yAxisId="bar" dataKey="profit" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" maxBarSize={24}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.profit >= 0 ? '#00C896' : '#FF4D6D'} fillOpacity={0.8} />
          ))}
        </Bar>
        <Line
          yAxisId="line"
          type="monotone"
          dataKey="cumulative"
          stroke="#FFB627"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#FFB627', stroke: '#0A0E1A', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1400}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
