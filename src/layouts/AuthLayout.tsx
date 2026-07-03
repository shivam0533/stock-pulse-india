import { Outlet } from 'react-router-dom';
import { Logo } from '@components/common/Logo';
import { APP_TAGLINE } from '@utils/constants';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-ink-950 text-ink-50 flex flex-col">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <Logo />
        <a
          href="#"
          className="text-xs text-ink-200 hover:text-ink-50 transition-colors"
        >
          Need help?
        </a>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-2xs text-ink-300">
        <p className="uppercase tracking-widest">{APP_TAGLINE}</p>
        <p>© {new Date().getFullYear()} Stock Pulse India · SEBI Registered</p>
      </footer>
    </div>
  );
}
