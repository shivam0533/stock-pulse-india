import { AlertTriangle, Cpu, Pause, Play, Square } from 'lucide-react';
import { Button, Modal } from '@components/ui';
import { cn } from '@utils/cn';
import type { BotStatus, BotStats } from '@/types';

interface BotControlPanelProps {
  status: BotStatus;
  stats: BotStats;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

const STATUS_CONFIG = {
  running:     { label: 'Running',        dot: 'bg-gain',      ring: 'ring-gain/30',      text: 'text-gain',      pulse: true  },
  stopped:     { label: 'Stopped',        dot: 'bg-ink-400',   ring: 'ring-ink-500/20',   text: 'text-ink-300',   pulse: false },
  paused:      { label: 'Paused',         dot: 'bg-brand-400', ring: 'ring-brand-400/30', text: 'text-brand-300', pulse: false },
  risk_paused: { label: 'Trading Paused', dot: 'bg-loss',      ring: 'ring-loss/30',      text: 'text-loss',      pulse: false },
  error:       { label: 'Error',          dot: 'bg-loss',      ring: 'ring-loss/30',      text: 'text-loss',      pulse: true  },
};

function formatUptime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BotControlPanel({ status, stats, onStart, onStop, onPause }: BotControlPanelProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-2xl border bg-ink-900/80',
        status === 'running'     ? 'border-gain/30 shadow-glow-gain'  :
        status === 'error'       ? 'border-loss/30 shadow-glow-loss'  :
        status === 'risk_paused' ? 'border-loss/40 bg-loss-subtle/10' :
        status === 'paused'      ? 'border-brand-400/30'              :
                                   'border-ink-600/60',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('relative flex h-3 w-3 shrink-0 rounded-full ring-4', cfg.dot, cfg.ring)}>
            {cfg.pulse && (
              <span className={cn('absolute inset-0 rounded-full animate-ping opacity-60', cfg.dot)} />
            )}
          </div>
          <div>
            <div className={cn('font-display text-base font-bold', cfg.text)}>
              BOT {cfg.label.toUpperCase()}
            </div>
            {status !== 'stopped' && (
              <div className="font-mono text-xs text-ink-300 tabular-nums">
                Uptime {formatUptime(stats.uptimeSeconds)}
              </div>
            )}
          </div>
        </div>
        <Cpu size={20} className={cn('shrink-0', cfg.text)} />
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onStart}
          disabled={status === 'running' || status === 'risk_paused'}
          leftIcon={<Play size={13} />}
          className="col-span-1"
        >
          Start
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onPause}
          disabled={status !== 'running'}
          leftIcon={<Pause size={13} />}
          className="col-span-1"
        >
          Pause
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onStop}
          disabled={status === 'stopped'}
          leftIcon={<Square size={13} />}
          className="col-span-1"
        >
          Stop
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Today's P&L", value: `${stats.todayPnL >= 0 ? '+' : ''}₹${stats.todayPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: stats.todayPnL >= 0 ? 'text-gain' : 'text-loss' },
          { label: 'Win Rate', value: `${Math.round((stats.winTrades / (stats.todayTrades || 1)) * 100)}%`, color: 'text-brand-300' },
          { label: 'Trades Today', value: stats.todayTrades, color: 'text-ink-100' },
          { label: 'Positions', value: `${stats.openPositions}/${stats.maxPositions}`, color: 'text-ink-100' },
          { label: 'Avg Slippage', value: `${stats.avgSlippage}%`, color: 'text-ink-100' },
          { label: 'Volume', value: `₹${(stats.totalVolume / 1e5).toFixed(1)}L`, color: 'text-ink-100' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-ink-900/60 border border-ink-600/40 rounded-xl p-2.5">
            <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
            <div className={cn('font-mono text-sm font-semibold tabular-nums mt-0.5', color)}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StopConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StopConfirmModal({ open, onConfirm, onCancel }: StopConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Stop Algo Bot" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-brand-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-ink-50">
              Stopping the bot will cancel all pending orders and close no existing positions.
            </p>
            <p className="mt-2 text-xs text-ink-300">
              Running trades will remain open and must be managed manually.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={onCancel} fullWidth>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} fullWidth>
            Stop Bot
          </Button>
        </div>
      </div>
    </Modal>
  );
}
