import { motion } from 'framer-motion';
import { OIBar } from './OIBar';
import { ChgOICell } from './ChgOICell';
import { formatIndianNumber, formatCompactNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { OptionChainFilter, OptionChainData, OptionStrike } from '@/types';

interface OptionChainTableProps {
  data: OptionChainData;
  filters: OptionChainFilter;
}

function moneyness(strike: number, atm: number): 'ATM' | 'ITM_CALL' | 'OTM_CALL' {
  if (strike === atm) return 'ATM';
  return strike < atm ? 'ITM_CALL' : 'OTM_CALL';
}

/** Sticky header row — both the group labels and column names */
function TableHeader() {
  return (
    <thead className="sticky top-0 z-20">
      <tr>
        {/* CALLS group label */}
        <th colSpan={4} className="bg-loss-subtle/20 border-b border-r border-ink-600/60 py-2 text-center text-xs font-semibold text-loss uppercase tracking-widest">
          CALLS
        </th>
        {/* Strike */}
        <th className="bg-ink-700/80 border-b border-ink-600/60 py-2 text-center text-xs font-semibold text-brand-300 uppercase tracking-widest sticky-col-strike">
          STRIKE
        </th>
        {/* PUTS group label */}
        <th colSpan={4} className="bg-gain-subtle/20 border-b border-l border-ink-600/60 py-2 text-center text-xs font-semibold text-gain uppercase tracking-widest">
          PUTS
        </th>
      </tr>
      <tr>
        {/* Call sub-headers */}
        {['VOLUME', 'CHG OI', 'OI', 'LTP'].map((col) => (
          <th key={`c-${col}`} className="bg-ink-800/95 border-b border-ink-600/40 px-3 py-2 text-right text-2xs font-medium text-ink-300 uppercase tracking-wide whitespace-nowrap">
            {col}
          </th>
        ))}
        {/* Strike sub-header */}
        <th className="bg-ink-700/80 border-b border-ink-600/40 px-3 py-2 text-center text-2xs font-medium text-brand-300 uppercase tracking-wide">
          PRICE
        </th>
        {/* Put sub-headers */}
        {['LTP', 'OI', 'CHG OI', 'VOLUME'].map((col) => (
          <th key={`p-${col}`} className="bg-ink-800/95 border-b border-ink-600/40 px-3 py-2 text-left text-2xs font-medium text-ink-300 uppercase tracking-wide whitespace-nowrap">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface RowProps {
  row: OptionStrike;
  atm: number;
  maxCallOI: number;
  maxPutOI: number;
  index: number;
}

function OptionRow({ row, atm, maxCallOI, maxPutOI, index }: RowProps) {
  const m = moneyness(row.strike, atm);
  const isATM = m === 'ATM';
  const isCallITM = m === 'ITM_CALL';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className={cn(
        'group border-b border-ink-600/25 transition-colors hover:bg-ink-700/30',
        isATM && 'bg-brand-400/5 hover:bg-brand-400/10',
      )}
    >
      {/* ── CALL side ──────────────────────────────────────── */}
      <td className={cn('px-3 py-2 text-right', isCallITM && 'bg-ink-700/30')}>
        <span className="font-mono text-xs text-ink-200 tabular-nums">
          {formatCompactNumber(row.callVolume)}
        </span>
      </td>
      <td className={cn('px-3 py-2 text-right', isCallITM && 'bg-ink-700/30')}>
        <ChgOICell value={row.callChgOI} />
      </td>
      <td className={cn('px-3 py-2 text-right', isCallITM && 'bg-ink-700/30')}>
        <OIBar value={row.callOI} maxValue={maxCallOI} side="call" />
      </td>
      <td className={cn('px-3 py-2 text-right', isCallITM && 'bg-ink-700/30')}>
        <span className={cn(
          'font-mono text-sm font-medium tabular-nums',
          isCallITM ? 'text-ink-50' : 'text-ink-200',
        )}>
          {formatIndianNumber(row.callLTP)}
        </span>
      </td>

      {/* ── STRIKE ──────────────────────────────────────────── */}
      <td className={cn(
        'px-4 py-2 text-center whitespace-nowrap bg-ink-700/60',
        isATM && 'bg-brand-400/20',
      )}>
        <span className={cn(
          'font-mono text-sm font-bold tabular-nums',
          isATM ? 'text-brand-300' : 'text-ink-50',
        )}>
          {formatIndianNumber(row.strike, 0)}
        </span>
        {isATM && (
          <span className="ml-1.5 align-middle inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-400 text-ink-950">
            ATM
          </span>
        )}
      </td>

      {/* ── PUT side ────────────────────────────────────────── */}
      <td className={cn('px-3 py-2 text-left', !isCallITM && row.strike > atm && 'bg-ink-700/30')}>
        <span className={cn(
          'font-mono text-sm font-medium tabular-nums',
          !isCallITM && row.strike > atm ? 'text-ink-50' : 'text-ink-200',
        )}>
          {formatIndianNumber(row.putLTP)}
        </span>
      </td>
      <td className={cn('px-3 py-2 text-left', !isCallITM && row.strike > atm && 'bg-ink-700/30')}>
        <OIBar value={row.putOI} maxValue={maxPutOI} side="put" />
      </td>
      <td className={cn('px-3 py-2 text-left', !isCallITM && row.strike > atm && 'bg-ink-700/30')}>
        <ChgOICell value={row.putChgOI} />
      </td>
      <td className={cn('px-3 py-2 text-left', !isCallITM && row.strike > atm && 'bg-ink-700/30')}>
        <span className="font-mono text-xs text-ink-200 tabular-nums">
          {formatCompactNumber(row.putVolume)}
        </span>
      </td>
    </motion.tr>
  );
}

export function OptionChainTable({ data, filters }: OptionChainTableProps) {
  // Filter by search
  let rows = filters.search
    ? data.strikes.filter((r) => String(r.strike).includes(filters.search))
    : data.strikes;

  // Filter by strikes around ATM
  if (filters.strikesAround !== 'all' && !filters.search) {
    const atmIdx = rows.findIndex((r) => r.strike === data.atmStrike);
    const half = filters.strikesAround / 2;
    const lo = Math.max(0, atmIdx - half);
    const hi = Math.min(rows.length - 1, atmIdx + half);
    rows = rows.slice(lo, hi + 1);
  }

  // Sort
  const sorted = [...rows].sort((a, b) => {
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    const key = filters.sortKey as keyof OptionStrike;
    return ((a[key] as number) - (b[key] as number)) * dir;
  });

  const maxCallOI = Math.max(...rows.map((r) => r.callOI), 1);
  const maxPutOI = Math.max(...rows.map((r) => r.putOI), 1);

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-ink-600/60 bg-ink-800/40">
      <table className="w-full min-w-[820px] border-collapse">
        <TableHeader />
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-16 text-center text-sm text-ink-300">
                No strikes match your filter.
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <OptionRow
                key={row.strike}
                row={row}
                atm={data.atmStrike}
                maxCallOI={maxCallOI}
                maxPutOI={maxPutOI}
                index={i}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
