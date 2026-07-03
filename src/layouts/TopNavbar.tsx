import { Menu, Search } from 'lucide-react';
import { MarketStatus } from '@components/common/MarketStatus';
import { SearchBar } from '@components/common/SearchBar';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';
import { useUIStore } from '@store/ui.store';

export function TopNavbar() {
  const { toggleMobileSidebar, openSearch } = useUIStore();

  return (
    <header className="sticky top-0 z-30 h-16 bg-ink-900/85 backdrop-blur-md border-b border-ink-600/60">
      <div className="h-full px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-ink-200 hover:text-ink-50 hover:bg-ink-700"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Search - inline on tablet/desktop, icon trigger on mobile */}
        <div className="hidden md:block flex-1 max-w-xl lg:mx-0">
          <SearchBar />
        </div>
        <button
          type="button"
          onClick={openSearch}
          className="md:hidden p-2 rounded-lg text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {/* Right cluster */}
        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          <div className="hidden md:block">
            <MarketStatus />
          </div>

          <NotificationsMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
