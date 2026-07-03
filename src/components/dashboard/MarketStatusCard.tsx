import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3 } from 'lucide-react';
import { MarketStatus } from '@components/common/MarketStatus';

function getISTTimeString(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

export function MarketStatusCard({ delay = 0 }: { delay?: number }) {
  const [time, setTime] = useState(getISTTimeString);

  useEffect(() => {
    const id = setInterval(() => setTime(getISTTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl p-4 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs text-ink-300 uppercase tracking-wide">Market Status</span>
        <Clock3 size={16} className="text-ink-300" />
      </div>
      <div className="mt-2">
        <MarketStatus />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-xl font-semibold text-ink-50 tabular-nums tracking-tight">
          {time}
        </span>
        <span className="text-2xs text-ink-300">IST</span>
      </div>
      <p className="mt-1 text-2xs text-ink-300">NSE / BSE · 09:15 - 15:30</p>
    </motion.div>
  );
}
