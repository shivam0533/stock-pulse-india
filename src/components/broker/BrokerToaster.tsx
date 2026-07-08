import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBrokerToastStore } from '@store/brokerToast.store';
import { cn } from '@utils/cn';

/** Renders broker connection/session toasts app-wide (mounted once in AppLayout). */
export function BrokerToaster() {
  const toasts = useBrokerToastStore((s) => s.toasts);

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-card backdrop-blur-sm text-sm font-medium pointer-events-auto',
              t.kind === 'error'
                ? 'border-loss-border bg-loss-subtle text-loss'
                : 'border-gain-border bg-gain-subtle text-gain',
            )}
          >
            {t.kind === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
