import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Matches TradeHistory.tsx's page header pattern — reused across every Admin page instead of a new one-off per page. */
export function AdminPageHeader({ icon: Icon, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-4 flex-wrap"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
          <Icon size={20} className="text-brand-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-ink-200 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </motion.div>
  );
}
