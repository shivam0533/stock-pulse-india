import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid3x3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { useStocks } from '@hooks/useStocks';
import { formatPercent } from '@utils/format';

function heatColor(changePercent: number): string {
  const intensity = Math.min(Math.abs(changePercent) / 2.5, 1);
  const alpha = 0.18 + intensity * 0.55;
  return changePercent >= 0
    ? `rgba(0, 200, 150, ${alpha.toFixed(2)})`
    : `rgba(255, 77, 109, ${alpha.toFixed(2)})`;
}

export function MarketHeatmap() {
  const { data, isLoading } = useStocks();
  const stocks = [...(data ?? [])].sort((a, b) => b.marketCap - a.marketCap).slice(0, 18);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 size={16} className="text-brand-300" />
          Market Heatmap
        </CardTitle>
        <span className="text-2xs text-ink-300 uppercase tracking-wide">By Market Cap</span>
      </CardHeader>
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {stocks.map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
              >
                <Link
                  to={`/stock/${stock.symbol}`}
                  style={{ backgroundColor: heatColor(stock.changePercent) }}
                  className="flex h-20 flex-col items-center justify-center rounded-xl border border-white/5 px-2 text-center transition-transform hover:scale-[1.04]"
                >
                  <span className="font-display text-xs font-semibold text-ink-50 truncate w-full">
                    {stock.symbol}
                  </span>
                  <span className="mt-1 font-mono text-2xs font-medium text-ink-50 tabular-nums">
                    {formatPercent(stock.changePercent)}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
