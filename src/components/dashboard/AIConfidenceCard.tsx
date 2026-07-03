import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '@components/ui';
import { useAIConfidence } from '@hooks/useDashboard';
import { formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';

const SENTIMENT_VARIANT = {
  Bullish: 'gain',
  Bearish: 'loss',
  Neutral: 'neutral',
} as const;

function ConfidenceGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 70 ? '#00C896' : score >= 45 ? '#FFB627' : '#FF4D6D';

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1A2138" strokeWidth="9" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-ink-50 tabular-nums">{score}</span>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">Confidence</span>
      </div>
    </div>
  );
}

export function AIConfidenceCard() {
  const { data, isLoading } = useAIConfidence();

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-brand-300" />
          AI Confidence
        </CardTitle>
        <Sparkles size={14} className="text-brand-300" />
      </CardHeader>

      {isLoading || !data ? (
        <div className="p-5 space-y-3">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <div className="p-5">
          <div className="flex items-center gap-5">
            <ConfidenceGauge score={data.overallScore} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SENTIMENT_VARIANT[data.sentiment]}>{data.sentiment}</Badge>
                <Badge variant="amber">{data.marketTrend}</Badge>
              </div>
              <p className="mt-2 text-xs text-ink-200 leading-relaxed text-balance">
                {data.summary}
              </p>
              <p className="mt-2 text-2xs text-ink-300">
                Updated {formatRelativeTime(data.updatedAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-ink-600/40 space-y-2.5">
            {data.factors.map((factor) => (
              <div key={factor.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-2xs text-ink-300 truncate">{factor.label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      factor.score >= 70 ? 'bg-gain' : factor.score >= 45 ? 'bg-brand-400' : 'bg-loss'
                    )}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-2xs text-ink-100 tabular-nums">
                  {factor.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
