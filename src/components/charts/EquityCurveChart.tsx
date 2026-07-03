import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate, formatINR } from '@utils/format';
import type { EquityPoint } from '@/types';

interface EquityCurveChartProps {
  data: EquityPoint[];
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: EquityPoint }>;
}

function EquityTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { equity, invested, timestamp } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl space-y-0.5">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{formatDate(timestamp)}</div>
      <div className="font-mono text-sm text-ink-50 tabular-nums">
        Equity: {formatINR(equity, { compact: true })}
      </div>
      <div className="font-mono text-2xs text-ink-300 tabular-nums">
        Invested: {formatINR(invested, { compact: true })}
      </div>
    </div>
  );
}

export function EquityCurveChart({ data, height = 280 }: EquityCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C896" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00C896" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#232B47" strokeDasharray="3 3" vertical={false} opacity={0.5} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(t) => formatDate(t, { month: 'short', day: '2-digit' })}
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          stroke="#6B7599"
          tick={{ fontSize: 11, fill: '#8B92A8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={64}
        />
        <Tooltip content={<EquityTooltip />} cursor={{ stroke: '#00C896', strokeDasharray: '3 3' }} />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#00C896"
          strokeWidth={2}
          fill="url(#equity-gradient)"
          dot={false}
          activeDot={{ r: 5, fill: '#00C896', stroke: '#0A0E1A', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="invested"
          stroke="#6B7599"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
