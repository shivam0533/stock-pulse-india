import { Globe, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@utils/cn';
import { formatRelativeTime } from '@utils/format';
import type { ApiConnection, ApiHealth } from '@/types';

const HEALTH_CONFIG: Record<ApiHealth, {
  dot: string; label: string; text: string; latencyColor: string;
}> = {
  connected:    { dot: 'bg-gain', label: 'Connected',    text: 'text-gain',      latencyColor: 'text-gain' },
  degraded:     { dot: 'bg-brand-400', label: 'Degraded', text: 'text-brand-300', latencyColor: 'text-brand-300' },
  disconnected: { dot: 'bg-loss', label: 'Offline',      text: 'text-loss',      latencyColor: 'text-loss' },
};

interface APIStatusPanelProps {
  connections: ApiConnection[];
}

function latencyBar(ms: number): string {
  if (ms <= 5)  return 'bg-gain';
  if (ms <= 20) return 'bg-brand-400';
  return 'bg-loss';
}

export function APIStatusPanel({ connections }: APIStatusPanelProps) {
  const allOk  = connections.every((c) => c.status === 'connected');
  const anyErr = connections.some((c) => c.status === 'disconnected');

  return (
    <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600/40">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-brand-300" />
          <span className="font-display text-sm font-semibold text-ink-50">API Status</span>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 text-2xs font-medium px-2 py-0.5 rounded-full border',
          anyErr
            ? 'border-loss/40 text-loss bg-loss-subtle'
            : allOk
              ? 'border-gain/40 text-gain bg-gain-subtle'
              : 'border-brand-400/40 text-brand-300 bg-brand-400/10',
        )}>
          {anyErr ? <WifiOff size={10} /> : <Wifi size={10} />}
          {anyErr ? 'Partial Outage' : allOk ? 'All Systems Go' : 'Degraded'}
        </div>
      </div>

      <div className="divide-y divide-ink-600/25">
        {connections.map((conn) => {
          const cfg = HEALTH_CONFIG[conn.status];
          const barPct = Math.min(100, (conn.latencyMs / 50) * 100);
          return (
            <div key={conn.id} className="px-4 py-3 hover:bg-ink-800/40 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex h-2 w-2 shrink-0 rounded-full">
                    <span className={cn('absolute inset-0 rounded-full', cfg.dot,
                      conn.status === 'connected' && 'animate-ping opacity-40',
                    )} />
                    <span className={cn('relative h-2 w-2 rounded-full', cfg.dot)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-50 truncate">{conn.name}</div>
                    <div className="text-2xs text-ink-400 truncate">{conn.endpoint}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn('font-mono text-xs font-semibold tabular-nums', cfg.latencyColor)}>
                    {conn.status !== 'disconnected' ? `${conn.latencyMs}ms` : '—'}
                  </div>
                  <div className={cn('text-2xs', cfg.text)}>{cfg.label}</div>
                </div>
              </div>
              {/* Latency bar */}
              {conn.status !== 'disconnected' && (
                <div className="mt-2 h-1 w-full rounded-full bg-ink-700 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', latencyBar(conn.latencyMs))}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              )}
              <div className="mt-1 text-2xs text-ink-400">
                Last check: {formatRelativeTime(conn.lastCheck)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
