import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@components/ui';
import { ROUTES } from '@utils/constants';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="font-mono text-7xl font-semibold text-gradient-amber tracking-tighter">
          404
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink-50">
          This page didn&apos;t make it to market
        </h1>
        <p className="mt-2 text-sm text-ink-200">
          The page you&apos;re looking for might have been moved, delisted, or never existed.
        </p>
        <Link to={ROUTES.DASHBOARD} className="inline-block mt-6">
          <Button size="lg">Back to dashboard</Button>
        </Link>
      </motion.div>
    </div>
  );
}
