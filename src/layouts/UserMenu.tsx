import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, LogOut, Settings, Star, User as UserIcon } from 'lucide-react';
import { Avatar, Badge } from '@components/ui';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@utils/constants';

export function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-ink-700 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
      >
        <Avatar name={user?.name ?? 'Guest'} size="sm" />
        <div className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium text-ink-50 truncate max-w-[120px]">
            {user?.name ?? 'Guest'}
          </span>
          <span className="text-2xs text-ink-300">
            {user?.kycStatus === 'verified' ? 'KYC Verified' : 'KYC Pending'}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-64 bg-ink-800 border border-ink-600 rounded-xl shadow-2xl overflow-hidden z-40"
            role="menu"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-600/60">
              <Avatar name={user?.name ?? 'Guest'} size="md" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-50 truncate">{user?.name}</div>
                <div className="text-xs text-ink-300 truncate">{user?.email}</div>
                {user?.kycStatus === 'verified' && (
                  <Badge variant="gain" className="mt-1">KYC Verified</Badge>
                )}
              </div>
            </div>

            <button onClick={() => handleNavigate(ROUTES.PORTFOLIO)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-100 hover:bg-ink-700 transition-colors">
              <Briefcase size={15} /><span>Portfolio</span>
            </button>
            <button onClick={() => handleNavigate(ROUTES.WATCHLIST)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-100 hover:bg-ink-700 transition-colors">
              <Star size={15} /><span>Watchlist</span>
            </button>
            <button onClick={() => handleNavigate(ROUTES.PROFILE)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-100 hover:bg-ink-700 transition-colors">
              <UserIcon size={15} /><span>Profile</span>
            </button>
            <button onClick={() => handleNavigate(ROUTES.SETTINGS)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-100 hover:bg-ink-700 transition-colors">
              <Settings size={15} /><span>Settings</span>
            </button>
            <div className="border-t border-ink-600/60" />
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-loss hover:bg-loss-subtle transition-colors">
              <LogOut size={15} /><span>Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
