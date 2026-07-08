import { motion } from 'framer-motion';
import { Button } from '@components/ui';
import { cn } from '@utils/cn';
import type { BrokerMeta } from '@config/brokers.config';

interface BrokerCardProps {
  broker: BrokerMeta;
  connected: boolean;
  onConnect: () => void;
}

export function BrokerCard({ broker, connected, onConnect }: BrokerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl p-5 shadow-card flex flex-col gap-4"
    >
      {/* Logo + identity */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-md',
            broker.gradient,
          )}
        >
          <span className="font-display text-base font-bold text-white">{broker.initials}</span>
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-semibold text-ink-50 truncate">{broker.name}</div>
          <div className="text-2xs text-ink-300 truncate">{broker.tagline}</div>
        </div>
      </div>

      {/* Status */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-2xs font-medium self-start',
          connected
            ? 'bg-gain-subtle text-gain border-gain-border'
            : 'bg-ink-700/60 text-ink-300 border-ink-600',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-gain' : 'bg-ink-400')} />
        {connected ? 'Connected' : 'Not Connected'}
      </span>

      {/* Connect button */}
      <Button
        variant={connected ? 'secondary' : 'primary'}
        size="sm"
        fullWidth
        onClick={onConnect}
      >
        {connected ? 'Manage' : 'Connect'}
      </Button>
    </motion.div>
  );
}
