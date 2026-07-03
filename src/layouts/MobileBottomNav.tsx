import { NavLink } from 'react-router-dom';
import { Briefcase, LayoutDashboard, LineChart, Menu, Star } from 'lucide-react';
import { useUIStore } from '@store/ui.store';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';
import type { NavItem } from '@/types';

const TAB_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Markets', path: ROUTES.MARKETS, icon: LineChart },
  { label: 'Portfolio', path: ROUTES.PORTFOLIO, icon: Briefcase },
  { label: 'Watchlist', path: ROUTES.WATCHLIST, icon: Star },
];

export function MobileBottomNav() {
  const { toggleMobileSidebar } = useUIStore();

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 lg:hidden',
        'bg-ink-900/95 backdrop-blur-md border-t border-ink-600/60',
        'pb-[env(safe-area-inset-bottom)]'
      )}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-16">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === ROUTES.DASHBOARD}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors',
                isActive ? 'text-brand-300' : 'text-ink-300 hover:text-ink-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex flex-col items-center justify-center gap-1 text-2xs font-medium text-ink-300 hover:text-ink-100 transition-colors"
          aria-label="More navigation"
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
