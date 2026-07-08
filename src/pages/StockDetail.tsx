import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, AlertCircle } from 'lucide-react';
import { Button, Card, Skeleton, Badge } from '@components/ui';
import { PriceChart } from '@components/charts/PriceChart';
import { PriceChange } from '@components/common/PriceChange';
import { useStock, useStockHistory } from '@hooks/useStocks';
import { formatIndianNumber, formatINR, formatCompactNumber } from '@utils/format';
import { ROUTES, TIMEFRAMES } from '@utils/constants';
import { cn } from '@utils/cn';
import type { Timeframe } from '@/types';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const { data: stock, isLoading, error } = useStock(symbol);
  const { data: history, isLoading: historyLoading } = useStockHistory(symbol, timeframe);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <AlertCircle size={36} className="text-loss mx-auto mb-3" />
        <h1 className="font-display text-xl font-semibold text-ink-50">
          Stock not found
        </h1>
        <p className="mt-2 text-sm text-ink-200">
          We couldn&apos;t find a listing for "{symbol}".
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-5">
          Go back
        </Button>
      </div>
    );
  }

  if (isLoading || !stock) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const positive = stock.change >= 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          to={ROUTES.DASHBOARD}
          className="inline-flex items-center gap-1.5 text-xs text-ink-200 hover:text-ink-50 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </motion.div>

      {/* Header */}
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
                {stock.symbol}
              </h1>
              <Badge variant="default">{stock.exchange}</Badge>
              <Badge variant="amber">{stock.sector}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-200">{stock.name}</p>

            <div className="mt-5 flex items-end gap-3 flex-wrap">
              <div className="font-mono text-4xl lg:text-5xl font-semibold text-ink-50 tabular-nums tracking-tight">
                ₹{formatIndianNumber(stock.price)}
              </div>
              <div className="mb-1.5">
                <PriceChange
                  change={stock.change}
                  changePercent={stock.changePercent}
                  showBoth
                  size="md"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Share">
              <Share2 size={14} />
            </Button>
            <Button>Buy</Button>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display text-base font-semibold text-ink-50">Price history</h2>
          <div className="flex gap-1 bg-ink-700/60 border border-ink-600 p-0.5 rounded-lg">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all tabular-nums',
                  timeframe === tf
                    ? 'bg-brand-400 text-ink-950'
                    : 'text-ink-200 hover:text-ink-50'
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <PriceChart data={history ?? []} positive={positive} />
        )}
      </Card>

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Open" value={`₹${formatIndianNumber(stock.open)}`} />
        <StatCard label="Previous Close" value={`₹${formatIndianNumber(stock.previousClose)}`} />
        <StatCard label="Day's Range" value={`₹${formatIndianNumber(stock.dayLow, 0)} – ₹${formatIndianNumber(stock.dayHigh, 0)}`} />
        <StatCard label="52W Range" value={`₹${formatIndianNumber(stock.yearLow, 0)} – ₹${formatIndianNumber(stock.yearHigh, 0)}`} />
        <StatCard label="Volume" value={formatCompactNumber(stock.volume)} />
        <StatCard label="Market Cap" value={formatINR(stock.marketCap, { compact: true })} />
        <StatCard label="P/E Ratio" value={stock.pe ? formatIndianNumber(stock.pe) : '–'} />
        <StatCard label="EPS" value={stock.eps ? `₹${formatIndianNumber(stock.eps)}` : '–'} />
      </div>

      {/* About */}
      <Card className="p-5 lg:p-6">
        <h2 className="font-display text-base font-semibold text-ink-50 mb-3">
          About {stock.name}
        </h2>
        <p className="text-sm text-ink-200 leading-relaxed text-balance">
          {stock.name} is a publicly traded company listed on the {stock.exchange} in the{' '}
          {stock.sector} sector. The information shown here is indicative and may be delayed
          by up to 15 minutes. For investment decisions, please consult your financial advisor
          and refer to the company&apos;s official disclosures on the exchange website.
        </p>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-800/60 border border-ink-600/60 rounded-xl p-3 lg:p-4">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{label}</div>
      <div className="mt-1 font-mono text-sm lg:text-base text-ink-50 tabular-nums">
        {value}
      </div>
    </div>
  );
}
