import { motion } from 'framer-motion';
import { APP_NAME, APP_TAGLINE } from '@utils/constants';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Full-screen loading state for app boot / route transitions.
 * Pulse-line motif matches the brand mark.
 */
export function LoadingScreen({ message = 'Connecting to markets' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-radial-fade" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated pulse line — the brand signature */}
        <motion.svg
          width="120"
          height="40"
          viewBox="0 0 120 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6"
        >
          <motion.path
            d="M2 20 L30 20 L40 6 L50 34 L60 12 L70 20 L118 20"
            stroke="#FFB627"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
          />
        </motion.svg>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="font-display text-xl font-semibold text-ink-50 tracking-tight"
        >
          {APP_NAME}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-1 text-xs text-ink-300 uppercase tracking-widest"
        >
          {APP_TAGLINE}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-8 text-xs text-ink-300 flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-dot" />
          {message}
        </motion.p>
      </div>
    </div>
  );
}
