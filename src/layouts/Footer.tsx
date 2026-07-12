import { Logo } from '@components/common/Logo';
import { APP_NAME } from '@utils/constants';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-600/40 bg-ink-900/40">
      <div className="px-4 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden md:inline text-2xs text-ink-300 uppercase tracking-widest border-l border-ink-600 pl-3 ml-1">
              SEBI Registered
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-300">
            <a href="#" className="hover:text-ink-50 transition-colors">About</a>
            <a href="#" className="hover:text-ink-50 transition-colors">Pricing</a>
            <a href="#" className="hover:text-ink-50 transition-colors">API Docs</a>
            <a href="#" className="hover:text-ink-50 transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink-50 transition-colors">Terms</a>
            <a href="mailto:stockpulseindia1226@gmail.com" className="hover:text-ink-50 transition-colors">Support</a>
          </nav>
        </div>

        <div className="mt-5 pt-5 border-t border-ink-600/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-2xs text-ink-300">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Market data is indicative and delayed
            by up to 15 minutes. Investments are subject to market risks.
          </p>
          <p className="font-mono">v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
