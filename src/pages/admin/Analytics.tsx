import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users2 } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { adminService } from '@services/admin.service';
import { formatIndianNumber } from '@utils/format';
import type { TradeStats } from '@/types';

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

function PnlDistributionCard({ stats, loading, error }: { stats: TradeStats | null; loading: boolean; error: string | null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">P&amp;L Distribution</h3>
      </div>
      {loading ? (
        <p className="text-xs text-ink-300 py-8 text-center">Loading…</p>
      ) : error ? (
        <p className="text-xs text-loss py-8 text-center">{error}</p>
      ) : !stats || stats.pnlDistribution.every((b) => b.count === 0) ? (
        <p className="text-xs text-ink-300 py-8 text-center">No live trades yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.pnlDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#232B47" strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#8B92A8' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8B92A8' }} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#171E33', border: '1px solid #232B47', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#8B92A8' }}
            />
            <Bar dataKey="count" fill="#FFB627" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function MostActiveUsersCard({ stats, loading, error }: { stats: TradeStats | null; loading: boolean; error: string | null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users2 size={15} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">Most Active Users</h3>
      </div>
      {loading ? (
        <p className="text-xs text-ink-300 py-8 text-center">Loading…</p>
      ) : error ? (
        <p className="text-xs text-loss py-8 text-center">{error}</p>
      ) : !stats || stats.mostActiveUsers.length === 0 ? (
        <p className="text-xs text-ink-300 py-8 text-center">No live trades yet.</p>
      ) : (
        <div className="space-y-2">
          {stats.mostActiveUsers.map((u, i) => (
            <div key={u.userId} className="flex items-center justify-between text-sm">
              <span className="text-ink-200 truncate">{i + 1}. {u.userName}</span>
              <span className="font-mono text-ink-50 tabular-nums shrink-0 ml-2">{u.tradeCount} trade{u.tradeCount !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MostTradedSymbolsCard({ stats, loading, error }: { stats: TradeStats | null; loading: boolean; error: string | null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={15} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">Most Traded Symbols</h3>
      </div>
      {loading ? (
        <p className="text-xs text-ink-300 py-8 text-center">Loading…</p>
      ) : error ? (
        <p className="text-xs text-loss py-8 text-center">{error}</p>
      ) : !stats || stats.mostTradedSymbols.length === 0 ? (
        <p className="text-xs text-ink-300 py-8 text-center">No live trades yet.</p>
      ) : (
        <div className="space-y-2">
          {stats.mostTradedSymbols.map((s, i) => (
            <div key={`${s.strike}-${s.side}`} className="flex items-center justify-between text-sm">
              <span className="text-ink-200">
                {i + 1}. {formatIndianNumber(s.strike, 0)} <span className={s.side === 'CE' ? 'text-loss' : 'text-gain'}>{s.side}</span>
              </span>
              <span className="font-mono text-ink-50 tabular-nums shrink-0 ml-2">{s.count} trade{s.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AdminAnalytics() {
  const [series, setSeries] = useState<Array<{ date: string; count: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getSignupsPerDay(30)
      .then((data) => { setSeries(data); setError(null); })
      .catch((err) => setError(err.message ?? 'Failed to load signup data'));
    adminService.getTradeStats()
      .then((data) => { setStats(data); setStatsError(null); })
      .catch((err) => setStatsError(err.message ?? 'Failed to load trade stats'))
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <AdminPageHeader icon={BarChart3} title="Analytics" subtitle="Signups and real (live, non-paper) trade activity across every user" />

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
        <PnlDistributionCard stats={stats} loading={statsLoading} error={statsError} />
        <MostActiveUsersCard stats={stats} loading={statsLoading} error={statsError} />
        <MostTradedSymbolsCard stats={stats} loading={statsLoading} error={statsError} />
      </div>
    </div>
  );
}
