import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, TrendingDown, TrendingUp, Wallet, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { PriceChange } from '@components/common/PriceChange';
import { AllocationDonut, type DonutSlice } from '@components/portfolio/AllocationDonut';
import { HoldingsTable, type EnrichedHolding } from '@components/portfolio/HoldingsTable';
import { usePortfolio } from '@hooks/usePortfolio';
import { MOCK_STOCKS } from '@api/mockData';
import { formatINR } from '@utils/format';
import { cn } from '@utils/cn';

// ── Per-stock colour palette (distinct from sector palette) ────────────────────
const STOCK_COLORS: Record<string, string> = {
  RELIANCE:  '#F97316',
  TCS:       '#A78BFA',
  HDFCBANK:  '#3B82F6',
  INFY:      '#22D3EE',
  ICICIBANK: '#60A5FA',
  ITC:       '#00C896',
};
const FALLBACK_COLORS = ['#FFB627', '#F472B6', '#FACC15', '#34D399'];

// ── Sector colour palette ──────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  Banking:        '#3B82F6',
  IT:             '#A78BFA',
  FMCG:           '#00C896',
  Energy:         '#F97316',
  Pharma:         '#22D3EE',
  Auto:           '#FACC15',
  Metals:         '#F472B6',
  Telecom:        '#60A5FA',
  Infrastructure: '#34D399',
  Realty:         '#FFB627',
};

// ── Summary stat tile ──────────────────────────────────────────────────────────
function SummaryTile({
  label, value, sub, color, icon: Icon, glow,
}: { label: string; value: string; sub?: React.ReactNode; color: string; icon: typeof Wallet; glow?: boolean }) {
  return (
    <div className={cn(
      'flex flex-col gap-2 p-4 rounded-2xl border bg-ink-800/60 backdrop-blur-sm',
      glow ? 'border-gain/30' : 'border-ink-600/60',
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs text-ink-300 uppercase tracking-widest">{label}</span>
        <div className={cn('h-7 w-7 flex items-center justify-center rounded-lg', color + '/15')}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold text-ink-50 tabular-nums tracking-tight">
        {value}
      </div>
      {sub && <div className="text-xs">{sub}</div>}
    </div>
  );
}

export default function Portfolio() {
  const { data, isLoading } = usePortfolio();

  // ── Enrich holdings with sector + color + allocationPct ─────────────────────
  const enriched = useMemo((): EnrichedHolding[] => {
    if (!data) return [];
    const total = data.currentValue || 1;
    return data.holdings.map((h, i) => {
      const stock = MOCK_STOCKS.find((s) => s.symbol === h.symbol);
      return {
        ...h,
        sector: stock?.sector ?? 'Other',
        color: STOCK_COLORS[h.symbol] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        allocationPct: Math.round((h.currentValue / total) * 1000) / 10,
      };
    });
  }, [data]);

  // ── Portfolio allocation slices (by stock) ───────────────────────────────────
  const portfolioSlices = useMemo((): DonutSlice[] =>
    enriched
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((h) => ({
        name: h.symbol,
        value: h.currentValue,
        color: h.color,
        pct: h.allocationPct,
        sub: h.name,
      })),
  [enriched]);

  // ── Sector allocation slices ─────────────────────────────────────────────────
  const sectorSlices = useMemo((): DonutSlice[] => {
    if (!enriched.length) return [];
    const map = new Map<string, number>();
    enriched.forEach((h) => map.set(h.sector, (map.get(h.sector) ?? 0) + h.currentValue));
    const total = enriched.reduce((a, h) => a + h.currentValue, 0) || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sector, value]) => ({
        name: sector,
        value,
        color: SECTOR_COLORS[sector] ?? '#6B7599',
        pct: Math.round((value / total) * 1000) / 10,
      }));
  }, [enriched]);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const totalPnLPos = data.totalPnL >= 0;
  const dayPos      = data.dayChange >= 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
            <Briefcase size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              Portfolio
            </h1>
            <p className="text-sm text-ink-200 mt-0.5">
              {data.holdings.length} holdings · NSE · Mock data
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Summary stats ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <SummaryTile
          label="Current Value"
          value={formatINR(data.currentValue, { compact: true })}
          icon={Wallet}
          color="text-brand-300"
          glow
          sub={<span className="text-ink-300">{formatINR(data.totalInvested, { compact: true })} invested</span>}
        />
        <SummaryTile
          label="Total Returns"
          value={`${totalPnLPos ? '+' : ''}${formatINR(data.totalPnL, { compact: true })}`}
          icon={totalPnLPos ? TrendingUp : TrendingDown}
          color={totalPnLPos ? 'text-gain' : 'text-loss'}
          sub={
            <PriceChange
              change={data.totalPnL}
              changePercent={data.totalPnLPercent}
              showArrow={false}
              size="xs"
            />
          }
        />
        <SummaryTile
          label="Day's P&L"
          value={`${dayPos ? '+' : ''}${formatINR(data.dayChange, { compact: true })}`}
          icon={dayPos ? TrendingUp : TrendingDown}
          color={dayPos ? 'text-gain' : 'text-loss'}
          sub={
            <PriceChange
              change={data.dayChange}
              changePercent={data.dayChangePercent}
              showArrow={false}
              size="xs"
            />
          }
        />
        <SummaryTile
          label="Unrealised P&L"
          value={formatINR(Math.abs(data.totalPnL), { compact: true })}
          icon={BarChart2}
          color="text-brand-300"
          sub={
            <span className={cn('font-mono text-xs', totalPnLPos ? 'text-gain' : 'text-loss')}>
              {totalPnLPos ? 'In profit' : 'In loss'} ·{' '}
              {data.holdings.filter((h) => h.pnl >= 0).length}W / {data.holdings.filter((h) => h.pnl < 0).length}L
            </span>
          }
        />
      </motion.div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-400" />
                Portfolio Allocation
              </CardTitle>
              <span className="text-2xs text-ink-300 uppercase tracking-wide">By Holding</span>
            </CardHeader>
            <div className="px-5 pb-5">
              <AllocationDonut
                data={portfolioSlices}
                centerLabel="Total Value"
                centerValue={formatINR(data.currentValue, { compact: true })}
                height={240}
              />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gain" />
                Sector Allocation
              </CardTitle>
              <span className="text-2xs text-ink-300 uppercase tracking-wide">By Sector</span>
            </CardHeader>
            <div className="px-5 pb-5">
              <AllocationDonut
                data={sectorSlices}
                centerLabel="Sectors"
                centerValue={String(sectorSlices.length)}
                height={240}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── Holdings table ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase size={16} className="text-brand-300" />
              Holdings
            </CardTitle>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">
              {data.holdings.length} positions
            </span>
          </CardHeader>
          <div className="p-4 pt-2">
            <HoldingsTable holdings={enriched} />
          </div>
        </Card>
      </motion.div>

    </div>
  );
}
