import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  BarChart2,
  Layers,
  ClipboardList,
  BarChart3,
  Plug,
  Settings,
  PanelLeftClose,
  PanelLeft,
  X,
  Users as UsersIcon,
  Radio,
  LifeBuoy,
  ScrollText,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@components/common/Logo';
import { useUIStore } from '@store/ui.store';
import { useAuthStore } from '@store/auth.store';
import { useIsBelowLg } from '@hooks/useMediaQuery';
import { ROUTES } from '@utils/constants';
import { cn } from '@utils/cn';
import type { NavItem } from '@/types';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Option Chain', path: ROUTES.OPTION_CHAIN, icon: BarChart2 },
  { label: 'Positions', path: ROUTES.POSITIONS, icon: Layers },
  { label: 'Trade History', path: ROUTES.TRADE_HISTORY, icon: ClipboardList },
  { label: 'Performance', path: ROUTES.PERFORMANCE, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
  { label: 'Broker Integration', path: ROUTES.BROKER_INTEGRATION, icon: Plug },
  { label: 'Profile', path: ROUTES.PROFILE, icon: User },
];

/** Only rendered for user.role === 'admin' — see the "Admin" section below. */
const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Users', path: ROUTES.ADMIN_USERS, icon: UsersIcon },
  { label: 'Trades', path: ROUTES.ADMIN_TRADES, icon: ClipboardList },
  { label: 'Live Activity', path: ROUTES.ADMIN_LIVE_ACTIVITY, icon: Radio },
  { label: 'Analytics', path: ROUTES.ADMIN_ANALYTICS, icon: BarChart3 },
  { label: 'Notifications', path: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
  { label: 'Support', path: ROUTES.ADMIN_SUPPORT, icon: LifeBuoy },
  { label: 'Logs', path: ROUTES.ADMIN_LOGS, icon: ScrollText },
  { label: 'Settings', path: ROUTES.ADMIN_SETTINGS, icon: ShieldCheck },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  // Must match this component's own Tailwind `lg:` classes (lg:sticky,
  // lg:z-30, lg:pointer-events-auto, the overlay's lg:hidden) exactly —
  // see useIsBelowLg's doc comment for why useIsMobile()'s 768px threshold
  // was the root cause of the drawer getting stuck open with a dead close
  // button on any 768–1023px-wide viewport (e.g. most phones in landscape).
  const isMobile = useIsBelowLg();
  const location = useLocation();

  const collapsed = !isMobile && sidebarCollapsed;

  // Belt-and-suspenders: close the mobile drawer the instant the route
  // actually changes, independent of whether the NavLink's own onClick fired
  // (some mobile WebKit browsers are known to drop touch/click events on
  // elements layered over a backdrop-blur overlay). This guarantees the
  // drawer never stays open after a real navigation, regardless of cause.
  useEffect(() => {
    if (mobileSidebarOpen) closeMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Escape key closes the drawer from anywhere on the page, not just via
  // clicks inside the sidebar itself.
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSidebarOpen, closeMobileSidebar]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 bg-ink-950/70 backdrop-blur-sm z-40 lg:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? 72 : 248,
          x: isMobile ? (mobileSidebarOpen ? 0 : -260) : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-30',
          'bg-ink-900/95 backdrop-blur-md border-r border-ink-600/60',
          'flex flex-col shrink-0',
          // Off-screen on mobile when closed — explicitly non-interactive so
          // it can never intercept touches near the left edge, even though
          // the transform should already move it out of the viewport.
          isMobile && !mobileSidebarOpen && 'pointer-events-none lg:pointer-events-auto'
        )}
      >
        {/* Logo header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-ink-600/40 shrink-0">
          {!collapsed && <Logo />}
          {collapsed && (
            <Logo showText={false} className="mx-auto" />
          )}
          {isMobile && (
            <button
              onClick={closeMobileSidebar}
              className="p-1.5 rounded-lg text-ink-200 hover:text-ink-50 hover:bg-ink-700"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.DASHBOARD}
              onClick={isMobile ? closeMobileSidebar : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                  'text-sm font-medium',
                  isActive
                    ? 'bg-brand-400/10 text-brand-300 border border-brand-400/20'
                    : 'text-ink-200 hover:bg-ink-700/60 hover:text-ink-50 border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 2}
                    className={cn('shrink-0', collapsed && 'mx-auto')}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
                  )}
                  {collapsed && (
                    <span
                      className={cn(
                        'pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap',
                        'bg-ink-800 border border-ink-600 text-xs font-medium text-ink-50 shadow-xl z-50',
                        'opacity-0 scale-95 origin-left transition-all duration-100',
                        'group-hover:opacity-100 group-hover:scale-100'
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 mt-2 border-t border-ink-600/30">
                {!collapsed && (
                  <div className="px-3 pb-2 text-2xs text-ink-300 uppercase tracking-wide">Admin</div>
                )}
              </div>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === ROUTES.ADMIN_DASHBOARD}
                  onClick={isMobile ? closeMobileSidebar : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-brand-400/10 text-brand-300 border border-brand-400/20'
                        : 'text-ink-200 hover:bg-ink-700/60 hover:text-ink-50 border border-transparent'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={18}
                        strokeWidth={isActive ? 2.4 : 2}
                        className={cn('shrink-0', collapsed && 'mx-auto')}
                      />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />}
                      {collapsed && (
                        <span
                          className={cn(
                            'pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap',
                            'bg-ink-800 border border-ink-600 text-xs font-medium text-ink-50 shadow-xl z-50',
                            'opacity-0 scale-95 origin-left transition-all duration-100',
                            'group-hover:opacity-100 group-hover:scale-100'
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer / collapse toggle */}
        <div className="border-t border-ink-600/40 p-3 shrink-0">
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className={cn(
                'group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl',
                'text-ink-300 hover:text-ink-50 hover:bg-ink-700/60 transition-colors text-sm'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft size={18} className="mx-auto" />
              ) : (
                <>
                  <PanelLeftClose size={18} />
                  <span>Collapse</span>
                </>
              )}
              {collapsed && (
                <span
                  className={cn(
                    'pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap',
                    'bg-ink-800 border border-ink-600 text-xs font-medium text-ink-50 shadow-xl z-50',
                    'opacity-0 scale-95 origin-left transition-all duration-100',
                    'group-hover:opacity-100 group-hover:scale-100'
                  )}
                >
                  Expand sidebar
                </span>
              )}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
