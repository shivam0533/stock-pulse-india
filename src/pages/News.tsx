import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Skeleton } from '@components/ui';
import { useNews } from '@hooks/usePortfolio';
import { formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { NewsItem } from '@/types';

const CATEGORIES: ('all' | NewsItem['category'])[] = ['all', 'markets', 'economy', 'earnings', 'ipo', 'crypto'];

const CATEGORY_VARIANTS = {
  markets: 'default',
  economy: 'amber',
  earnings: 'gain',
  ipo: 'amber',
  crypto: 'neutral',
} as const;

export default function News() {
  const { data, isLoading } = useNews();
  const [category, setCategory] = useState<'all' | NewsItem['category']>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === 'all') return data;
    return data.filter((n) => n.category === category);
  }, [data, category]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
          News
        </h1>
        <p className="mt-1 text-sm text-ink-200">
          Markets, earnings, and economic updates from Indian publications.
        </p>
      </motion.div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all capitalize whitespace-nowrap',
              category === c
                ? 'bg-brand-400/15 text-brand-300 border-brand-400/40'
                : 'bg-ink-800 text-ink-200 border-ink-600 hover:border-ink-500 hover:text-ink-50'
            )}
          >
            {c === 'all' ? 'All news' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-3 w-32 mb-3" />
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-5 w-4/5 mb-3" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))
          : filtered.map((item) => (
              <a
                key={item.id}
                href={item.url}
                className="group block"
              >
                <Card className="p-5 h-full hover:border-ink-500 transition-colors">
                  <div className="flex items-center gap-2 text-2xs text-ink-300">
                    <Badge variant={CATEGORY_VARIANTS[item.category]}>{item.category}</Badge>
                    <span>{item.source}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(item.publishedAt)}</span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-ink-50 leading-snug group-hover:text-brand-300 transition-colors text-balance">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-200 leading-relaxed text-balance">
                    {item.summary}
                  </p>
                  {item.tickers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-ink-600/40 flex flex-wrap gap-1.5">
                      {item.tickers.map((t) => (
                        <span
                          key={t}
                          className="text-2xs font-mono text-ink-200 px-1.5 py-0.5 rounded bg-ink-700/60 border border-ink-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </a>
            ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <Card className="px-5 py-12 text-center">
          <p className="text-sm text-ink-200">No news in this category right now.</p>
        </Card>
      )}
    </div>
  );
}
