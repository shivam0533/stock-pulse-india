import { motion } from 'framer-motion';
import { OIBar } from './OIBar';
import { ChgOICell } from './ChgOICell';
import { formatIndianNumber, formatCompactNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { OptionChainFilter, OptionChainData, OptionStrike } from '@/types';

interface OptionChainTableProps {
  data: OptionChainData;
  filters: OptionChainFilter;
  /** Called when user clicks BUY CE or BUY PE on a row. */
  onBuyOption?: (strike: number, side: 'CE' | 'PE', ltp: number) => void;
  /** Disables BUY buttons when an active trade is already open. */
  tradingDisabled?: boolean;
}

function moneyness(strike: number, atm: number): 'ATM' | 'ITM_CALL' | 'OTM_CALL' {
  if (strike === atm) return 'ATM';
  return strike < atm ? 'ITM_CALL' : 'OTM_CALL';
}

// ── Header ────────────────────────────────────────────────────────────────────
function TableHeader() {
  return (
    <thead className="sticky top-0 z-20">
      {/* Group labels */}
      <tr>
        <th
          colSpan={5}
          className="bg-loss-subtle/20 border-b border-r border-ink-600/60 py-2 text-center text-xs font-semibold text-loss uppercase tracking-widest"
        >
          CALLS
        </th>
        <th className="bg-ink-700/80 border-b border-ink-600/60 py-2 text-center text-xs font-semibold text-brand-300 uppercase tracking-widest">
          STRIKE
        </th>
        <th
          colSpan={5}
          className="bg-gain-subtle/20 border-b border-l border-ink-600/60 py-2 text-center text-xs font-semibold text-gain uppercase tracking-widest"
        >
          PUTS
        </th>
      </tr>

      {/* Column sub-headers */}
      <tr>
        {/* Call columns */}
        {['VOLUME', 'CHG OI', 'OI', 'LTP'].map((col) => (
          <th
            key={`c-${col}`}
            className="bg-ink-800/95 border-b border-ink-600/40 px-3 py-2 text-right text-2xs font-medium text-ink-300 uppercase tracking-wide whitespace-nowrap"
          >
            {col}
          </th>
        ))}
        {/* BUY CE column */}
        <th className="bg-ink-800/95 border-b border-r border-ink-600/40 px-2 py-2 text-center text-2xs font-medium text-loss uppercase tracking-wide whitespace-nowrap w-16">
          BUY CE
        </th>

        {/* Strike */}
        <th className="bg-ink-700/80 border-b border-ink-600/40 px-3 py-2 text-center text-2xs font-medium text-brand-300 uppercase tracking-wide">
          PRICE
        </th>

        {/* BUY PE column */}
        <th className="bg-ink-800/95 border-b border-l border-ink-600/40 px-2 py-2 text-center text-2xs font-medium text-gain uppercase tracking-wide whitespace-nowrap w-16">
          BUY PE
        </th>
        {/* Put columns */}
        {['LTP', 'OI', 'CHG OI', 'VOLUME'].map((col) => (
          <th
            key={`p-${col}`}
            className="bg-ink-800/95 border-b border-ink-600/40 px-3 py-2 text-left text-2xs font-medium text-ink-300 uppercase tracking-wide whitespace-nowrap"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
interface RowProps {
  row: OptionStrike;
  atm: number;
  maxCallOI: number;
  maxPutOI: number;
  index: number;
  onBuyOption?: (strike: number, side: 'CE' | 'PE', ltp: number) => void;
  tradingDisabled?: boolean;
}

function BuyButton({
  side,
  ltp,
  disabled,
  onClick,
}: {
  side: 'CE' | 'PE';
  ltp: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isCall = side === 'CE';
  const activeClass = isCall
    ? 'text-loss bg-loss-subtle border-loss-border hover:bg-loss/15 hover:border-loss/50'
    : 'text-gain bg-gain-subtle border-gain-border hover:bg-gain/15 hover:border-gain/50';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={
        disabled
          ? 'Exit current trade before opening a new position'
          : `Buy NIFTY ${side} @ ₹${ltp}`
      }
      className={cn(
        'px-2.5 py-1 rounded-lg text-2xs font-bold border uppercase tracking-wider transition-all duration-150',
        disabled
          ? 'opacity-30 cursor-not-allowed text-ink-400 bg-transparent border-ink-600'
          : activeClass,
      )}
    >
      BUY
    </button>
  );
}

function OptionRow({ row, atm, maxCallOI, maxPutOI, index, onBuyOption, tradingDisabled }: RowProps) {
  const m         = moneyness(row.strike, atm);
  const isATM     = m === 'ATM';
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
      {/* ── CALL side ──────────────────────────────────────────────────── */}
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
        <span
          className={cn(
            'font-mono text-sm font-medium tabular-nums',
            isCallITM ? 'text-ink-50' : 'text-ink-200',
          )}
        >
          {formatIndianNumber(row.callLTP)}
        </span>
      </td>
      {/* BUY CE button */}
      <td className={cn('px-2 py-2 text-center border-r border-ink-600/30', isCallITM && 'bg-ink-700/30')}>
        <BuyButton
          side="CE"
          ltp={row.callLTP}
          disabled={tradingDisabled}
          onClick={() => onBuyOption?.(row.strike, 'CE', row.callLTP)}
        />
      </td>

      {/* ── STRIKE ──────────────────────────────────────────────────────── */}
      <td
        className={cn(
          'px-4 py-2 text-center whitespace-nowrap bg-ink-700/60',
          isATM && 'bg-brand-400/20',
        )}
      >
        <span
          className={cn(
            'font-mono text-sm font-bold tabular-nums',
            isATM ? 'text-brand-300' : 'text-ink-50',
          )}
        >
          {formatIndianNumber(row.strike, 0)}
        </span>
        {isATM && (
          <span className="ml-1.5 align-middle inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-400 text-ink-950">
            ATM
          </span>
        )}
      </td>

      {/* ── PUT side ────────────────────────────────────────────────────── */}
      {/* BUY PE button */}
      <td
        className={cn(
          'px-2 py-2 text-center border-l border-ink-600/30',
          !isCallITM && row.strike > atm && 'bg-ink-700/30',
        )}
      >
        <BuyButton
          side="PE"
          ltp={row.putLTP}
          disabled={tradingDisabled}
          onClick={() => onBuyOption?.(row.strike, 'PE', row.putLTP)}
        />
      </td>
      <td className={cn('px-3 py-2 text-left', !isCallITM && row.strike > atm && 'bg-ink-700/30')}>
        <span
          className={cn(
            'font-mono text-sm font-medium tabular-nums',
            !isCallITM && row.strike > atm ? 'text-ink-50' : 'text-ink-200',
          )}
        >
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

// ── Table ─────────────────────────────────────────────────────────────────────
export function OptionChainTable({
  data,
  filters,
  onBuyOption,
  tradingDisabled = false,
}: OptionChainTableProps) {
  // Filter by search
  let rows = filters.search
    ? data.strikes.filter((r) => String(r.strike).includes(filters.search))
    : data.strikes;

  // Filter by strikes around ATM
  if (filters.strikesAround !== 'all' && !filters.search) {
    const atmIdx = rows.findIndex((r) => r.strike === data.atmStrike);
    const half   = filters.strikesAround / 2;
    const lo     = Math.max(0, atmIdx - half);
    const hi     = Math.min(rows.length - 1, atmIdx + half);
    rows = rows.slice(lo, hi + 1);
  }

  // Sort
  const sorted = [...rows].sort((a, b) => {
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    const key = filters.sortKey as keyof OptionStrike;
    return ((a[key] as number) - (b[key] as number)) * dir;
  });

  const maxCallOI = Math.max(...rows.map((r) => r.callOI), 1);
  const maxPutOI  = Math.max(...rows.map((r) => r.putOI), 1);

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-ink-600/60 bg-ink-800/40">
      <table className="w-full min-w-[960px] border-collapse">
        <TableHeader />
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-16 text-center text-sm text-ink-300">
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
                onBuyOption={onBuyOption}
                tradingDisabled={tradingDisabled}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
