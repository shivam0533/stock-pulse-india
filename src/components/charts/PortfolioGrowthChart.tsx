import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate, formatINR } from '@utils/format';
import type { GrowthPoint } from '@/types';

interface PortfolioGrowthChartProps {
  data: GrowthPoint[];
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: GrowthPoint }>;
}

function GrowthTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { value, timestamp } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">
        {formatDate(timestamp, { month: 'short', year: 'numeric' })}
      </div>
      <div className="font-mono text-sm text-ink-50 mt-0.5 tabular-nums">
        {formatINR(value, { compact: true })}
      </div>
    </div>
  );
}

export function PortfolioGrowthChart({ data, height = 280 }: PortfolioGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="growth-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFB627" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FFB627" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#232B47" strokeDasharray="3 3" vertical={false} opacity={0.5} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(t) => formatDate(t, { month: 'short' })}
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <Tooltip content={<GrowthTooltip />} cursor={{ stroke: '#FFB627', strokeDasharray: '3 3' }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#FFB627"
          strokeWidth={2}
          fill="url(#growth-gradient)"
          dot={false}
          activeDot={{ r: 5, fill: '#FFB627', stroke: '#0A0E1A', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
