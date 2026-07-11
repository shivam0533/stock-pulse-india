import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Newspaper, Receipt, TrendingUp, Info, Megaphone, AlertTriangle } from 'lucide-react';
import { useNotificationsStore } from '@store/notifications.store';
import { formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';
import type { AppNotification, NotificationType } from '@/types';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  'price-alert': TrendingUp,
  order: Receipt,
  news: Newspaper,
  system: Info,
  maintenance: AlertTriangle,
  'market-alert': TrendingUp,
  popup: Megaphone,
};

const TYPE_CLASSES: Record<NotificationType, string> = {
  'price-alert': 'bg-gain-subtle text-gain',
  order: 'bg-brand-400/15 text-brand-300',
  news: 'bg-ink-700 text-ink-200',
  system: 'bg-ink-700 text-ink-200',
  maintenance: 'bg-brand-400/15 text-brand-300',
  'market-alert': 'bg-gain-subtle text-gain',
  popup: 'bg-loss-subtle text-loss',
};

export function NotificationsMenu() {
  const navigate = useNavigate();
  const { items, markAsRead, markAllAsRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleSelect = (notification: AppNotification) => {
    markAsRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-400 px-1 text-[10px] font-bold text-ink-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute right-0 top-full mt-2 w-[min(22rem,90vw)] bg-ink-800 border border-ink-600',
              'rounded-xl shadow-2xl overflow-hidden z-40'
            )}
            role="menu"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600/60">
              <span className="text-sm font-semibold text-ink-50">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-2xs text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-ink-200">
                  You&apos;re all caught up.
                </div>
              ) : (
                items.map((notification) => {
                  const Icon = TYPE_ICON[notification.type];
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-ink-600/30 last:border-b-0',
                        'hover:bg-ink-700/50',
                        !notification.read && 'bg-ink-700/20'
                      )}
                    >
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TYPE_CLASSES[notification.type])}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-ink-50 leading-snug">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-200 leading-snug line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-2xs text-ink-300">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
