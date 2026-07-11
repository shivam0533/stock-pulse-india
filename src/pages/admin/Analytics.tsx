import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users2 } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminComingSoon } from '@components/admin/AdminComingSoon';
import { adminService } from '@services/admin.service';

interface SignupTooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: { date: string; count: number } }>;
}

function SignupTooltip({ active, payload }: SignupTooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{date}</div>
      <div className="font-mono text-sm text-ink-50 mt-0.5 tabular-nums">{count} signup{count !== 1 ? 's' : ''}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [series, setSeries] = useState<Array<{ date: string; count: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getSignupsPerDay(30)
      .then((data) => { setSeries(data); setError(null); })
      .catch((err) => setError(err.message ?? 'Failed to load signup data'));
  }, []);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <AdminPageHeader icon={BarChart3} title="Analytics" subtitle="New Users Per Day is real; the rest needs Phase 2 trade data" />

      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-ink-50 mb-4">New Users Per Day (last 30 days)</h3>
        {error ? (
          <p className="text-sm text-loss text-center py-16">{error}</p>
        ) : series.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-16">No signup data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="signups-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB627" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FFB627" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#232B47" strokeDasharray="3 3" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                stroke="#6B7599"
                tick={{ fontSize: 11, fill: '#8B92A8' }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                allowDecimals={false}
                stroke="#6B7599"
                tick={{ fontSize: 11, fill: '#8B92A8' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<SignupTooltip />} cursor={{ stroke: '#FFB627', strokeDasharray: '3 3', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#FFB627"
                strokeWidth={2}
                fill="url(#signups-gradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#FFB627', stroke: '#0A0E1A', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminComingSoon icon={TrendingUp} title="P&L Distribution" reason="Needs Phase 2's trades table." />
        <AdminComingSoon icon={Users2} title="Most Active Users" reason="Needs Phase 2's trades table." />
        <AdminComingSoon icon={DollarSign} title="Most Traded Symbols" reason="Needs Phase 2's trades table." />
      </div>
    </div>
  );
}
