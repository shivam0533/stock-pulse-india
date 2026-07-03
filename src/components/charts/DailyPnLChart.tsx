import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@utils/format';
import type { DailyPnLPoint } from '@/types';

interface DailyPnLChartProps {
  data: DailyPnLPoint[];
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: DailyPnLPoint }>;
}

function PnLTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { label, pnl } = payload[0].payload;
  const positive = pnl >= 0;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
      <div className={`font-mono text-sm mt-0.5 tabular-nums ${positive ? 'text-gain' : 'text-loss'}`}>
        {positive ? '+' : ''}{formatINR(pnl, { compact: true })}
      </div>
    </div>
  );
}

export function DailyPnLChart({ data, height = 240 }: DailyPnLChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#232B47" strokeDasharray="3 3" vertical={false} opacity={0.5} />
        <XAxis
          dataKey="label"
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <Tooltip content={<PnLTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={28}>
          {data.map((d) => (
            <Cell key={d.timestamp} fill={d.pnl >= 0 ? '#00C896' : '#FF4D6D'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
