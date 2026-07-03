import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '@utils/format';
import type { SectorAllocation } from '@/types';

interface SectorAllocationChartProps {
  data: SectorAllocation[];
  height?: number;
}

export const SECTOR_COLORS = ['#FFB627', '#00C896', '#3B82F6', '#A78BFA', '#F472B6', '#22D3EE', '#FACC15', '#FB7185'];

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: SectorAllocation }>;
}

function AllocationTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { sector, value, percent } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{sector}</div>
      <div className="font-mono text-sm text-ink-50 mt-0.5 tabular-nums">
        {formatINR(value, { compact: true })}
      </div>
      <div className="font-mono text-2xs text-ink-300 tabular-nums">{percent}% of portfolio</div>
    </div>
  );
}

export function SectorAllocationChart({ data, height = 240 }: SectorAllocationChartProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="sector"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={entry.sector} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<AllocationTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full sm:w-1/2 space-y-2">
        {data.map((entry, i) => (
          <div key={entry.sector} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
              />
              <span className="text-ink-100 truncate">{entry.sector}</span>
            </div>
            <span className="font-mono text-ink-300 tabular-nums shrink-0">{entry.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
