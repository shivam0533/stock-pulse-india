import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppRouter } from '@routes/AppRouter';
import { LoadingScreen } from '@components/loading/LoadingScreen';
import { queryClient } from '@api/queryClient';
import { useAuthStore } from '@store/auth.store';
import { useThemeStore } from '@store/theme.store';

export function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const setTheme = useThemeStore((s) => s.setTheme);
  const theme = useThemeStore((s) => s.theme);
  const [booted, setBooted] = useState(false);

  // Boot sequence: restore session + apply theme.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTheme(theme); // ensures class is applied
      await hydrate();
      // Minimum splash duration so the brand mark gets a moment.
      await new Promise((r) => setTimeout(r, 350));
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
    // We deliberately run this once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!booted) {
    return <LoadingScreen message="Connecting to markets" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
