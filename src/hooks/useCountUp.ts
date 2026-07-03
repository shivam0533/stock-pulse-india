import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `end` over `duration` ms using cubic ease-out.
 * Re-runs whenever `end` changes (period switch) or `key` changes.
 */
export function useCountUp(end: number, duration = 1200, key?: string | number): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const endRef = useRef(end);
  endRef.current = end;

  useEffect(() => {
    setValue(0);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setValue(eased * endRef.current);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // key intentionally in deps to force restart on period switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration, key]);

  return value;
}
