import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SearchBar } from '@components/common/SearchBar';
import { useUIStore } from '@store/ui.store';

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUIStore();

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen, closeSearch]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-ink-950/80 backdrop-blur-sm md:hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
            className="px-4 pt-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchBar variant="modal" autoFocus onResultClick={closeSearch} />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="p-2.5 rounded-xl text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors shrink-0"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
