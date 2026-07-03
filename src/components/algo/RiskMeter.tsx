import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@utils/cn';
import type { RiskMetric } from '@/types';

interface RiskMeterProps {
  metrics: RiskMetric[];
}

const STATUS_COLOR = {
  safe:     { bar: 'bg-gain',      text: 'text-gain',     label: 'Safe'     },
  warning:  { bar: 'bg-brand-400', text: 'text-brand-300', label: 'Warning' },
  critical: { bar: 'bg-loss',      text: 'text-loss',     label: 'Critical'  },
};

// Overall risk score 0-100 derived from metrics
function overallRisk(metrics: RiskMetric[]): number {
  if (!metrics.length) return 0;
  const avg = metrics.reduce((a, m) => a + (m.current / m.max) * 100, 0) / metrics.length;
  return Math.round(avg);
}

function riskGaugeColor(pct: number): string {
  if (pct >= 75) return '#FF4D6D';
  if (pct >= 50) return '#FFB627';
  return '#00C896';
}

export function RiskMeter({ metrics }: RiskMeterProps) {
  const overall = overallRisk(metrics);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - overall / 100);
  const color = riskGaugeColor(overall);

  return (
    <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-600/40">
        <ShieldCheck size={15} className="text-brand-300" />
        <span className="font-display text-sm font-semibold text-ink-50">Risk Meter</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Circular gauge */}
        <div className="flex items-center justify-center">
          <div className="relative" style={{ width: 108, height: 108 }}>
            <svg width={108} height={108} viewBox="0 0 108 108" className="-rotate-90">
              <circle cx="54" cy="54" r={r} fill="none" stroke="#1A2138" strokeWidth="10" />
              <motion.circle
                cx="54" cy="54" r={r}
                fill="none" stroke={color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>
                {overall}
              </span>
              <span className="text-2xs text-ink-300 uppercase tracking-wide">Risk %</span>
            </div>
          </div>
        </div>

        {/* Individual metrics */}
        <div className="space-y-2.5">
          {metrics.map((m) => {
            const pct = Math.min(100, (m.current / m.max) * 100);
            const cfg = STATUS_COLOR[m.status];
            return (
              <div key={m.label}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-2xs text-ink-300">{m.label}</span>
                  <span className={cn('font-mono text-2xs font-semibold tabular-nums', cfg.text)}>
                    {m.current}{m.unit} / {m.max}{m.unit}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', cfg.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
