import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { PricePoint } from '@/types';

interface MiniChartProps {
  data: PricePoint[];
  positive?: boolean;
  height?: number;
}

/**
 * Minimal sparkline-style area chart. No axes, no tooltips —
 * just a visual rhythm of recent price movement.
 */
export function MiniChart({ data, positive = true, height = 48 }: MiniChartProps) {
  const color = positive ? '#00C896' : '#FF4D6D';
  const id = `mini-${positive ? 'g' : 'l'}-${data.length}`;

  if (!data.length) return <div style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${id})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
