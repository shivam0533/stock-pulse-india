import { motion } from 'framer-motion';

interface ConfidenceMeterProps {
  score: number;   // 0–100
  size?: number;
}

export function ConfidenceMeter({ score, size = 72 }: ConfidenceMeterProps) {
  const r = (size / 2) - 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = score >= 75 ? '#00C896' : score >= 55 ? '#FFB627' : '#FF4D6D';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#1A2138" strokeWidth="7"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[9px] text-ink-300 uppercase tracking-wide">AI%</span>
      </div>
    </div>
  );
}
