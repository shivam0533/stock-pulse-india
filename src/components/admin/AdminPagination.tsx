import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@utils/cn';

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Server-paginated counterpart of TradeHistory.tsx's (client-paginated) pager — same visual pattern, driven by a real `total` from the API instead of a local array length. */
export function AdminPagination({ page, pageSize, total, onPageChange }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-ink-600/40">
      <span className="text-xs text-ink-300">
        Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 text-ink-200 hover:text-ink-50 hover:border-ink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'h-7 min-w-7 px-2 rounded-lg text-xs font-medium border transition-colors',
              p === safePage
                ? 'bg-brand-400/20 text-brand-300 border-brand-400/40'
                : 'border-ink-600 text-ink-300 hover:text-ink-50 hover:border-ink-500',
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 text-ink-200 hover:text-ink-50 hover:border-ink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
