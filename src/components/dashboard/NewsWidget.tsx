import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '@components/ui';
import { useNews } from '@hooks/usePortfolio';
import { formatRelativeTime } from '@utils/format';
import { ROUTES } from '@utils/constants';

const CATEGORY_VARIANTS = {
  markets: 'default',
  economy: 'amber',
  earnings: 'gain',
  ipo: 'amber',
  crypto: 'neutral',
} as const;

export function NewsWidget() {
  const { data, isLoading } = useNews();
  const items = data?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest News</CardTitle>
        <Link
          to={ROUTES.NEWS}
          className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
        >
          View all <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 border-b border-ink-600/30 last:border-b-0">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          : items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                className="block px-5 py-4 hover:bg-ink-700/40 transition-colors border-b border-ink-600/30 last:border-b-0 group"
              >
                <div className="flex items-center gap-2 text-2xs text-ink-300">
                  <Badge variant={CATEGORY_VARIANTS[item.category]}>
                    {item.category}
                  </Badge>
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(item.publishedAt)}</span>
                </div>
                <h4 className="mt-1.5 text-sm font-medium text-ink-50 leading-snug group-hover:text-brand-300 transition-colors text-balance">
                  {item.title}
                </h4>
              </a>
            ))}
      </div>
    </Card>
  );
}
