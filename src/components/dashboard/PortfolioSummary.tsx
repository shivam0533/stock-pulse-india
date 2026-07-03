import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase } from 'lucide-react';
import { Card, Skeleton } from '@components/ui';
import { PriceChange } from '@components/common/PriceChange';
import { usePortfolio } from '@hooks/usePortfolio';
import { formatINR } from '@utils/format';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';

export function PortfolioSummary() {
  const { data, isLoading } = usePortfolio();

  if (isLoading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-24" />
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-ink-200">
            <Briefcase size={14} />
            <span className="text-xs uppercase tracking-wide">Portfolio Value</span>
          </div>
          <div className="mt-2 font-mono text-3xl font-semibold text-ink-50 tabular-nums tracking-tight">
            {formatINR(data.currentValue, { compact: true })}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <PriceChange
              change={data.totalPnL}
              changePercent={data.totalPnLPercent}
              showBoth
              size="sm"
            />
            <span className="text-ink-300 text-xs">total returns</span>
          </div>
        </div>

        <Link
          to={ROUTES.PORTFOLIO}
          className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
        >
          Details <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-5 pt-4 border-t border-ink-600/40 grid grid-cols-3 gap-3">
        <div>
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Invested</div>
          <div className="font-mono text-sm text-ink-100 mt-1 tabular-nums">
            {formatINR(data.totalInvested, { compact: true })}
          </div>
        </div>
        <div>
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Day's P&amp;L</div>
          <div className={cn(
            'font-mono text-sm mt-1 tabular-nums',
            data.dayChange >= 0 ? 'text-gain' : 'text-loss'
          )}>
            {data.dayChange >= 0 ? '+' : ''}{formatINR(data.dayChange, { compact: true })}
          </div>
        </div>
        <div>
          <div className="text-2xs text-ink-300 uppercase tracking-wide">Holdings</div>
          <div className="font-mono text-sm text-ink-100 mt-1 tabular-nums">
            {data.holdings.length}
          </div>
        </div>
      </div>
    </Card>
  );
}
