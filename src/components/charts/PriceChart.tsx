import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatIndianNumber, formatDate, formatTime } from '@utils/format';
import type { PricePoint } from '@/types';

interface PriceChartProps {
  data: PricePoint[];
  positive?: boolean;
  showTimeAxis?: boolean;
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: PricePoint }>;
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { price, timestamp } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">
        {formatDate(timestamp)} · {formatTime(timestamp)}
      </div>
      <div className="font-mono text-sm text-ink-50 mt-0.5 tabular-nums">
        ₹{formatIndianNumber(price)}
      </div>
    </div>
  );
}

export function PriceChart({
  data,
  positive = true,
  showTimeAxis = true,
  height = 320,
}: PriceChartProps) {
  const color = positive ? '#00C896' : '#FF4D6D';

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-ink-300 text-sm"
      >
        No price data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="price-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="#232B47"
          strokeDasharray="3 3"
          vertical={false}
          opacity={0.5}
        />
        {showTimeAxis && (
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => formatDate(t, { month: 'short', day: '2-digit' })}
            stroke="#6B7599"
            tick={{ fontSize: 11, fill: '#8B92A8' }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
        )}
        <YAxis
          domain={['dataMin', 'dataMax']}
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatIndianNumber(v, 0)}
          width={60}
          orientation="right"
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: '#FFB627', strokeDasharray: '3 3', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill="url(#price-gradient)"
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: '#0A0E1A', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
