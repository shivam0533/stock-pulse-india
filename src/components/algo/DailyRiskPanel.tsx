import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Ban, RefreshCw, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@components/ui';
import { cn } from '@utils/cn';
import type { DailyRiskSettings, DailyRiskState, RiskStatus } from '@/types';

interface DailyRiskPanelProps {
  riskState: DailyRiskState;
  settings: DailyRiskSettings;
  onReset: () => void;
}

const RISK_STATUS_CONFIG: Record<RiskStatus, {
  border: string; bg: string; text: string; icon: typeof ShieldCheck; label: string;
}> = {
  safe:          { border: 'border-gain/40',       bg: 'bg-gain-subtle',      text: 'text-gain',      icon: ShieldCheck,  label: 'Safe'          },
  warning:       { border: 'border-brand-400/50',  bg: 'bg-brand-400/10',     text: 'text-brand-300', icon: ShieldAlert,  label: 'Warning'       },
  limit_reached: { border: 'border-loss/50',       bg: 'bg-loss-subtle',      text: 'text-loss',      icon: Ban,          label: 'Limit Reached' },
};

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  barPct?: number;
  barColor?: string;
  icon?: typeof TrendingUp;
}

function StatTile({ label, value, sub, color = 'text-ink-50', barPct, barColor }: StatTileProps) {
  return (
    <div className="bg-ink-900/70 border border-ink-600/40 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
      <div className={cn('font-mono text-xl font-bold tabular-nums leading-none', color)}>{value}</div>
      {sub && <div className="text-2xs text-ink-400">{sub}</div>}
      {barPct !== undefined && (
        <div className="h-1 w-full rounded-full bg-ink-700 overflow-hidden mt-0.5">
          <motion.div
            className={cn('h-full rounded-full', barColor ?? 'bg-gain')}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, barPct)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
}

export function DailyRiskPanel({ riskState, settings, onReset }: DailyRiskPanelProps) {
  const {
    totalTrades, winTrades, lossTrades, dailyPnL,
    tradingEnabled, riskStatus, limitReachedAt,
  } = riskState;

  const remainingTrades = Math.max(0, settings.maxTradesPerDay - totalTrades);
  const remainingLosses = Math.max(0, settings.maxDailyLosses - lossTrades);
  const tradeUsedPct   = (totalTrades / settings.maxTradesPerDay) * 100;
  const lossUsedPct    = (lossTrades / settings.maxDailyLosses) * 100;
  const rsCfg          = RISK_STATUS_CONFIG[riskStatus];

  const tradeLimitColor =
    tradeUsedPct >= 90 ? 'bg-loss'      :
    tradeUsedPct >= 70 ? 'bg-brand-400' : 'bg-gain';

  const lossLimitColor =
    lossUsedPct >= 100 ? 'bg-loss'      :
    lossUsedPct >= 75  ? 'bg-brand-400' : 'bg-gain';

  const pnlPositive = dailyPnL >= 0;

  return (
    <div className="space-y-3">
      {/* ── Alert Banner ───────────────────────────────────────── */}
      <AnimatePresence>
        {riskStatus === 'limit_reached' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-loss/60 bg-loss-subtle shadow-glow-loss"
          >
            <div className="flex items-start gap-3">
              <Ban size={20} className="text-loss shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-loss text-sm leading-snug">
                  Daily Maximum Loss Limit Reached ({settings.maxDailyLosses} Losses). Trading Stopped.
                </p>
                <p className="text-xs text-loss/70 mt-0.5">
                  New BUY and SELL orders are disabled. Auto Trading has been paused.
                  {limitReachedAt && ` · Triggered at ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(limitReachedAt))}`}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={onReset}
              leftIcon={<RefreshCw size={13} />}
              className="shrink-0"
            >
              Reset Stats
            </Button>
          </motion.div>
        )}

        {riskStatus === 'warning' && tradingEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-brand-400/50 bg-brand-400/10"
          >
            <AlertTriangle size={16} className="text-brand-300 shrink-0" />
            <p className="text-xs text-brand-300 flex-1">
              <span className="font-semibold">Risk Warning:</span>{' '}
              {remainingLosses <= 1
                ? `Only ${remainingLosses} more losing trade${remainingLosses === 1 ? '' : 's'} allowed before auto-halt.`
                : `${remainingTrades} trades remaining today.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <StatTile
          label="Total Trades"
          value={`${totalTrades}/${settings.maxTradesPerDay}`}
          sub={`${remainingTrades} remaining`}
          color={tradeUsedPct >= 90 ? 'text-loss' : tradeUsedPct >= 70 ? 'text-brand-300' : 'text-ink-50'}
          barPct={tradeUsedPct}
          barColor={tradeLimitColor}
        />
        <StatTile
          label="Winning Trades"
          value={winTrades}
          sub={`Win rate ${totalTrades ? Math.round((winTrades / totalTrades) * 100) : 0}%`}
          color="text-gain"
        />
        <StatTile
          label="Losing Trades"
          value={`${lossTrades}/${settings.maxDailyLosses}`}
          sub={`${remainingLosses} loss${remainingLosses === 1 ? '' : 'es'} left`}
          color={lossTrades >= settings.maxDailyLosses ? 'text-loss' : lossTrades >= settings.maxDailyLosses - 1 ? 'text-brand-300' : 'text-ink-50'}
          barPct={lossUsedPct}
          barColor={lossLimitColor}
        />
        <StatTile
          label="Daily P&L"
          value={`${pnlPositive ? '+' : ''}₹${Math.abs(dailyPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={pnlPositive ? 'Profitable session' : 'Negative session'}
          color={pnlPositive ? 'text-gain' : 'text-loss'}
        />
        <StatTile
          label="Trade Limit Left"
          value={remainingTrades}
          sub={remainingTrades === 0 ? 'Limit reached' : 'of today\'s quota'}
          color={remainingTrades === 0 ? 'text-loss' : remainingTrades <= 2 ? 'text-brand-300' : 'text-ink-50'}
        />
        <StatTile
          label="Loss Allowance Left"
          value={remainingLosses}
          sub={remainingLosses === 0 ? 'No losses allowed' : `of ${settings.maxDailyLosses} max`}
          color={remainingLosses === 0 ? 'text-loss' : remainingLosses === 1 ? 'text-brand-300' : 'text-gain'}
        />
        <div className="bg-ink-900/70 border border-ink-600/40 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Bot Status</div>
          <div className={cn('font-semibold text-sm leading-tight', rsCfg.text)}>
            {tradingEnabled ? (riskStatus === 'warning' ? 'Active · Warning' : 'Active') : 'Trading Paused'}
          </div>
          <div className="text-2xs text-ink-400">{settings.autoStop ? 'Auto-stop ON' : 'Auto-stop OFF'}</div>
        </div>
        <div className={cn(
          'border rounded-xl p-3 flex flex-col gap-1.5 transition-colors',
          rsCfg.bg, rsCfg.border,
        )}>
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Risk Status</div>
          <div className={cn('flex items-center gap-1.5 font-bold text-sm', rsCfg.text)}>
            <rsCfg.icon size={14} />
            {rsCfg.label}
          </div>
          <div className={cn('text-2xs', rsCfg.text + '/80')}>
            {riskStatus === 'limit_reached' ? 'Manual reset required' :
             riskStatus === 'warning'       ? 'Approaching limit'     : 'Within limits'}
          </div>
        </div>
      </div>

      {/* Manual reset when not in limit_reached state */}
      {riskStatus !== 'limit_reached' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-2xs text-ink-400 hover:text-ink-200 transition-colors"
          >
            <RefreshCw size={11} />
            Reset daily statistics
          </button>
        </div>
      )}
    </div>
  );
}
