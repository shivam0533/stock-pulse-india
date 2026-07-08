import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, LogOut, Clock, ShieldAlert, TrendingUp, XCircle } from 'lucide-react';
import { useOptionChainToastStore, type OptionToastKind } from '@store/optionChainToast.store';
import { cn } from '@utils/cn';

const KIND_CONFIG: Record<OptionToastKind, { icon: typeof CheckCircle2; className: string }> = {
  opened:      { icon: TrendingUp,   className: 'border-brand-400/40 bg-brand-400/10 text-brand-300' },
  closed:      { icon: LogOut,       className: 'border-ink-600 bg-ink-700/80 text-ink-100' },
  'stop-loss': { icon: ShieldAlert,  className: 'border-loss-border bg-loss-subtle text-loss' },
  target:      { icon: CheckCircle2, className: 'border-gain-border bg-gain-subtle text-gain' },
  'square-off':{ icon: Clock,        className: 'border-brand-400/40 bg-brand-400/10 text-brand-300' },
  rejected:    { icon: XCircle,      className: 'border-loss-border bg-loss-subtle text-loss' },
};

/** Renders the Option Chain's toast stack. Mount only inside the Option Chain page — never globally. */
export function OptionChainToaster() {
  const toasts = useOptionChainToastStore((s) => s.toasts);

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, className } = KIND_CONFIG[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-card backdrop-blur-sm text-sm font-medium pointer-events-auto',
                className,
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
