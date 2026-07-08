import { Plug } from 'lucide-react';
import { useBrokerConnectionStore } from '@store/brokerConnection.store';
import { cn } from '@utils/cn';

interface BrokerConnectionBadgeProps {
  className?: string;
}

/**
 * Small, global "which broker is connected" indicator — visible in the top
 * navbar on every page, not just the Broker Integration page. Renders
 * nothing when no broker is connected, to avoid cluttering the navbar with
 * a "not connected" state that's already the default assumption.
 */
export function BrokerConnectionBadge({ className }: BrokerConnectionBadgeProps) {
  const connections = useBrokerConnectionStore((s) => s.connections);
  const connected = Object.values(connections).filter(Boolean);

  if (connected.length === 0) return null;

  const primary = connected[0]!;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-gain-border bg-gain-subtle',
        className,
      )}
      role="status"
      title={`${primary.brokerName} · ${primary.clientCode} connected`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-gain opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-gain" />
      </span>
      <Plug size={12} className="text-gain" />
      <span className="text-xs font-medium text-gain hidden lg:inline">
        {primary.brokerName} Connected
      </span>
    </div>
  );
}
