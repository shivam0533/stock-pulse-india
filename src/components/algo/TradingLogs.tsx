import { useEffect, useRef } from 'react';
import { Download, Terminal } from 'lucide-react';
import { cn } from '@utils/cn';
import type { LogEntry, LogLevel } from '@/types';

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string; label: string }> = {
  INFO: { color: 'text-ink-200',   bg: 'bg-ink-700 text-ink-200',    label: 'INFO' },
  EXEC: { color: 'text-gain',      bg: 'bg-gain-subtle text-gain',    label: 'EXEC' },
  WARN: { color: 'text-brand-300', bg: 'bg-brand-400/15 text-brand-300', label: 'WARN' },
  ERROR:{ color: 'text-loss',      bg: 'bg-loss-subtle text-loss',    label: 'ERR!' },
  SYS:  { color: 'text-ink-400',   bg: 'bg-ink-800 text-ink-300',     label: 'SYS ' },
};

function formatTs(ts: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(ts));
}

interface TradingLogsProps {
  entries: LogEntry[];
  isRunning: boolean;
}

export function TradingLogs({ entries, isRunning }: TradingLogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isAtBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleDownload = () => {
    const text = entries
      .map((e) => `[${formatTs(e.timestamp)}] [${e.level.padEnd(4)}] ${e.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `algo-logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="bg-ink-950 border border-ink-600/60 rounded-2xl overflow-hidden flex flex-col">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-900/80 border-b border-ink-600/40 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-loss/80" />
            <span className="h-3 w-3 rounded-full bg-brand-400/80" />
            <span className="h-3 w-3 rounded-full bg-gain/80" />
          </div>
          <Terminal size={13} className="text-ink-300" />
          <span className="font-mono text-xs text-ink-300">algo-engine · trading.log</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-2xs text-gain font-mono">
              <span className="animate-pulse">▊</span> LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-ink-400 font-mono">{entries.length} lines</span>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 rounded text-ink-400 hover:text-ink-100 transition-colors"
            title="Download logs"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5 min-h-[220px] max-h-[300px]"
      >
        {entries.map((entry) => {
          const cfg = LEVEL_CONFIG[entry.level];
          return (
            <div
              key={entry.id}
              className="flex items-start gap-2 leading-relaxed hover:bg-ink-800/40 px-1 py-0.5 rounded"
            >
              <span className="text-ink-500 shrink-0 tabular-nums select-none">
                {formatTs(entry.timestamp)}
              </span>
              <span className={cn(
                'shrink-0 inline-flex items-center justify-center px-1 rounded text-[10px] font-bold leading-tight',
                cfg.bg,
              )}>
                {cfg.label}
              </span>
              <span className={cn('flex-1 min-w-0 break-words', cfg.color)}>
                {entry.message}
              </span>
            </div>
          );
        })}

        {/* Blinking cursor */}
        {isRunning && (
          <div className="flex items-center gap-2 px-1 py-0.5">
            <span className="text-ink-500 select-none">{formatTs(Date.now())}</span>
            <span className="text-gain font-bold animate-pulse">▊</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
