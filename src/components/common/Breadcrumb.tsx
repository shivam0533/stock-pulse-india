import { Fragment } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';

interface Crumb {
  label: string;
  path?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  [ROUTES.MARKETS]: 'Markets',
  [ROUTES.PORTFOLIO]: 'Portfolio',
  [ROUTES.WATCHLIST]: 'Watchlist',
  [ROUTES.NEWS]: 'News',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.OPTION_CHAIN]: 'NIFTY Option Chain',
  [ROUTES.SIGNALS]: 'AI Trading Signals',
  [ROUTES.ALGO]: 'Algo Console',
  [ROUTES.ANALYTICS]: 'Performance Analytics',
  [ROUTES.TRADE_HISTORY]: 'Trade History',
  [ROUTES.SETTINGS]: 'Settings',
};

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const { symbol } = useParams<{ symbol?: string }>();

  if (pathname === ROUTES.DASHBOARD) return [];

  if (symbol && pathname.startsWith('/stock/')) {
    return [
      { label: 'Markets', path: ROUTES.MARKETS },
      { label: symbol.toUpperCase() },
    ];
  }

  const label = ROUTE_LABELS[pathname];
  if (label) return [{ label }];

  return [];
}

export function Breadcrumb({ className }: { className?: string }) {
  const crumbs = useBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs', className)}>
      <Link
        to={ROUTES.DASHBOARD}
        className="flex items-center gap-1 text-ink-300 hover:text-ink-50 transition-colors"
      >
        <Home size={13} />
        <span className="sr-only">Dashboard</span>
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={crumb.label}>
            <ChevronRight size={13} className="text-ink-400 shrink-0" />
            {crumb.path && !isLast ? (
              <Link to={crumb.path} className="text-ink-300 hover:text-ink-50 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn('truncate max-w-[200px]', isLast ? 'text-ink-50 font-medium' : 'text-ink-300')}>
                {crumb.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
