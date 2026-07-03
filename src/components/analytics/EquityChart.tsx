import {
  Area, CartesianGrid, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatINR, formatDate } from '@utils/format';
import type { AnalyticsEquityPoint } from '@/types';

interface EquityChartProps {
  data: AnalyticsEquityPoint[];
  height?: number;
  initialCapital: number;
}

interface TTPayload {
  active?: boolean;
  payload?: Array<{ payload: AnalyticsEquityPoint }>;
}

function ChartTooltip({ active, payload }: TTPayload) {
  if (!active || !payload?.[0]) return null;
  const { equity, drawdown, peak, timestamp } = payload[0].payload;
  const isDrawdown = drawdown < -0.1;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-xl px-3 py-2.5 shadow-2xl space-y-1.5 min-w-[180px]">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">
        {formatDate(timestamp, { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Equity</span>
        <span className="font-mono text-sm text-ink-50 font-semibold tabular-nums">{formatINR(equity, { compact: true })}</span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-2xs text-ink-300">Peak</span>
        <span className="font-mono text-xs text-ink-200 tabular-nums">{formatINR(peak, { compact: true })}</span>
      </div>
      {isDrawdown && (
        <div className="flex items-baseline justify-between gap-4 pt-1 border-t border-ink-600/40">
          <span className="text-2xs text-loss">Drawdown</span>
          <span className="font-mono text-xs text-loss tabular-nums font-semibold">{drawdown.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

export function EquityChart({ data, height = 320, initialCapital }: EquityChartProps) {
  if (!data.length) return null;

  const finalEquity = data[data.length - 1].equity;
  const isPositive = finalEquity >= initialCapital;
  const lineColor = isPositive ? '#FFB627' : '#FF4D6D';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dd-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4D6D" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#1A2138" strokeDasharray="3 3" vertical={false} opacity={0.8} />

        <XAxis
          dataKey="timestamp"
          tickFormatter={(t) => formatDate(t, { month: 'short', day: '2-digit' })}
          stroke="#232B47"
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis
          yAxisId="equity"
          orientation="right"
          stroke="#232B47"
          tick={{ fontSize: 11, fill: '#6B7599' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v, { compact: true, decimals: 0 })}
          width={72}
        />

        <Tooltip content={<ChartTooltip />} cursor={{ stroke: lineColor, strokeDasharray: '3 3', strokeOpacity: 0.5 }} />

        {/* Capital baseline */}
        <ReferenceLine
          yAxisId="equity"
          y={initialCapital}
          stroke="#6B7599"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />

        {/* Equity area */}
        <Area
          yAxisId="equity"
          type="monotone"
          dataKey="equity"
          stroke={lineColor}
          strokeWidth={2.5}
          fill="url(#equity-fill)"
          dot={false}
          activeDot={{ r: 5, fill: lineColor, stroke: '#0A0E1A', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1200}
          animationEasing="ease-out"
        />

        {/* Peak line */}
        <Line
          yAxisId="equity"
          type="monotone"
          dataKey="peak"
          stroke="#6B7599"
          strokeWidth={1}
          strokeDasharray="2 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
