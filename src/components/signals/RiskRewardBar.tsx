import { formatIndianNumber } from '@utils/format';

interface RiskRewardBarProps {
  entry: number;
  target: number;
  stopLoss: number;
  riskReward: number;
  action: 'BUY' | 'SELL' | 'HOLD';
}

export function RiskRewardBar({ entry, target, stopLoss, riskReward, action }: RiskRewardBarProps) {
  const isBuy = action === 'BUY' || action === 'HOLD';
  const lo = Math.min(entry, target, stopLoss);
  const hi = Math.max(entry, target, stopLoss);
  const range = hi - lo || 1;

  const entryPct = ((entry - lo) / range) * 100;
  const targetPct = ((target - lo) / range) * 100;
  const slPct = ((stopLoss - lo) / range) * 100;

  const gainPct = (((target - entry) / entry) * 100).toFixed(1);
  const lossPct = (((stopLoss - entry) / entry) * 100).toFixed(1);

  return (
    <div>
      {/* Bar */}
      <div className="relative h-2.5 w-full rounded-full bg-ink-700 overflow-hidden">
        {isBuy ? (
          <>
            {/* Loss zone (SL → Entry) */}
            <div
              className="absolute inset-y-0 bg-loss/40 rounded-l-full"
              style={{ left: `${slPct}%`, width: `${entryPct - slPct}%` }}
            />
            {/* Gain zone (Entry → Target) */}
            <div
              className="absolute inset-y-0 bg-gain/40 rounded-r-full"
              style={{ left: `${entryPct}%`, width: `${targetPct - entryPct}%` }}
            />
          </>
        ) : (
          <>
            {/* Gain zone for SELL (Target → Entry) */}
            <div
              className="absolute inset-y-0 bg-gain/40"
              style={{ left: `${targetPct}%`, width: `${entryPct - targetPct}%` }}
            />
            {/* Loss zone (Entry → SL) */}
            <div
              className="absolute inset-y-0 bg-loss/40"
              style={{ left: `${entryPct}%`, width: `${slPct - entryPct}%` }}
            />
          </>
        )}
        {/* Entry marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-brand-400"
          style={{ left: `${entryPct}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-gain"
          style={{ left: `${targetPct}%` }}
        />
        {/* SL marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-loss"
          style={{ left: `${slPct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1.5 text-2xs tabular-nums">
        <div className="text-loss">
          <div>SL ₹{formatIndianNumber(stopLoss, 0)}</div>
          <div>{lossPct}%</div>
        </div>
        <div className="text-center text-brand-300">
          <div>Entry</div>
          <div>₹{formatIndianNumber(entry, 1)}</div>
        </div>
        <div className="text-right text-gain">
          <div>Tgt ₹{formatIndianNumber(target, 0)}</div>
          <div>+{gainPct}%</div>
        </div>
      </div>

      <div className="mt-1 text-center text-2xs text-ink-300">
        Risk/Reward <span className="text-brand-300 font-semibold">{riskReward}×</span>
      </div>
    </div>
  );
}
