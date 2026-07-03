import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatINR } from '@utils/format';
import type { MonthlyPoint } from '@/types';

interface MonthlyProfitChartProps {
  data: MonthlyPoint[];
  height?: number;
}

interface TTPayload {
  active?: boolean;
  payload?: Array<{ payload: MonthlyPoint }>;
}

function MonthTooltip({ active, payload }: TTPayload) {
  if (!active || !payload?.[0]) return null;
  const { month, profit, trades, winRate } = payload[0].payload;
  const pos = profit >= 0;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 shadow-2xl space-y-1.5 min-w-[160px]">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{month}</div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">P&L</span>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pos ? 'text-gain' : 'text-loss'}`}>
          {pos ? '+' : ''}{formatINR(profit, { compact: true })}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Trades</span>
        <span className="font-mono text-xs text-ink-200 tabular-nums">{trades}</span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Win Rate</span>
        <span className="font-mono text-xs text-brand-300 tabular-nums">{winRate}%</span>
      </div>
    </div>
  );
}

export function MonthlyProfitChart({ data, height = 260 }: MonthlyProfitChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke="#1A2138" strokeDasharray="3 3" vertical={false} opacity={0.8} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="#6B7599" strokeOpacity={0.4} />
        <Bar dataKey="profit" radius={[5, 5, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out">
          {data.map((d) => (
            <Cell
              key={d.month}
              fill={d.profit >= 0 ? '#00C896' : '#FF4D6D'}
              fillOpacity={d.profit >= 0 ? 0.85 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
