import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(max-width: 1024px)');
/**
 * Matches Tailwind's `lg` breakpoint (1024px) exactly. Sidebar.tsx's mobile
 * drawer vs. permanent-sidebar behavior is entirely gated by `lg:` classes
 * (lg:sticky, lg:z-30, lg:pointer-events-auto, lg:hidden on the overlay) —
 * it must use this, not useIsMobile()'s 768px threshold. A phone in
 * landscape (or any device 768–1023px wide) previously fell into a gap
 * where useIsMobile() was false (desktop behavior: sidebar forced to x:0,
 * always visible) while every Tailwind lg: class still applied mobile
 * layout — so the drawer looked "open" with no way to close it, since the
 * close handlers all correctly updated state but the x-position animation
 * ignored that state whenever isMobile was false.
 */
export const useIsBelowLg = () => useMediaQuery('(max-width: 1023.98px)');
