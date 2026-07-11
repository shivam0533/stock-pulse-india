import { Search, X } from 'lucide-react';

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Matches TradeHistory.tsx's search box exactly — reused here instead of a new one-off. */
export function AdminSearchBar({ value, onChange, placeholder = 'Search…' }: AdminSearchBarProps) {
  return (
    <div className="relative flex items-center bg-ink-800 border border-ink-600/60 rounded-xl focus-within:border-brand-400/60 transition-colors flex-1 min-w-[180px]">
      <Search size={14} className="ml-3 text-ink-300 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent h-10 px-2.5 text-sm text-ink-50 placeholder:text-ink-300 outline-none"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="mr-2 p-1 rounded text-ink-300 hover:text-ink-50">
          <X size={13} />
        </button>
      )}
    </div>
  );
}
