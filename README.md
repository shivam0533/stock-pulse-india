# Stock Pulse India

A premium real-time tracking platform for Indian retail investors covering NSE and BSE markets, with portfolio analytics, watchlists, and news.

This is a production-ready frontend built with a strict separation between API, services, state, and UI — designed to plug into a real backend by flipping a single env flag.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript | Fast HMR, strict typing |
| UI | React 18 + Tailwind CSS | Composable design tokens |
| Routing | React Router v6 | Nested layouts, guards |
| State | Zustand | Minimal boilerplate, persistence built-in |
| Data | TanStack Query | Cache + polling + invalidation |
| Motion | Framer Motion | Page and component transitions |
| Charts | Recharts | Lightweight, themeable |
| Icons | Lucide React | Consistent stroke, large catalog |

## Design

A deliberately calmer take on fintech dark mode. Instead of the usual neon-green-on-black, the palette is built around:

- **Midnight navy backgrounds** (`#0A0E1A` → `#1A2138`) so the eyes can sit on the page for hours
- **Warm amber** (`#FFB627`) as the single brand accent — a quiet nod to Indian context without being heavy-handed
- **Emerald and ruby** reserved exclusively for P&L semantics — gains and losses should never have to compete with brand color
- **JetBrains Mono** for every price, percentage, and volume — numbers align under each other
- **Space Grotesk** display + **Inter** body — characterful without sacrificing legibility

The recurring motif is the **pulse line** — visible in the logo, loading screen, and live indicators on index cards.

## Project structure

```
src/
├── api/             # Axios client, endpoints, query client, mock data
├── assets/          # Static assets
├── components/
│   ├── ui/          # Primitives: Button, Card, Input, Badge, Modal, Skeleton, Avatar
│   ├── common/      # Logo, SearchBar, PriceChange, MarketStatus
│   ├── charts/      # MiniChart (sparkline), PriceChart (full)
│   ├── dashboard/   # IndexCard, TopMovers, PortfolioSummary, NewsWidget
│   ├── stocks/      # StockRow
│   └── loading/     # LoadingScreen, PulseLoader
├── hooks/           # useStocks, usePortfolio, useStockSearch, useDebounce, useMediaQuery
├── layouts/         # AppLayout, AuthLayout, Sidebar, TopNavbar, Footer
├── pages/           # Dashboard, Markets, StockDetail, Portfolio, Watchlist, News, Profile, Login, Signup, NotFound
├── routes/          # AppRouter, ProtectedRoute, PublicRoute
├── services/        # auth, stocks, portfolio, news — all API calls go here
├── store/           # auth, theme, ui, watchlist (Zustand)
├── types/           # Domain types: Stock, MarketIndex, User, PortfolioHolding, etc.
└── utils/           # cn (className), format (INR), market (hours), storage, constants
```

The boundaries are strict: **pages compose components**, **components consume hooks**, **hooks call services**, **services call the API client**. UI never imports `axios` directly.

## Getting started

```bash
# Install
npm install

# Copy env file
cp .env.example .env

# Dev server (http://localhost:5173)
npm run dev

# Production build
npm run build
npm run preview

# Type check
npm run type-check
```

### Demo credentials

The app boots with mock data enabled (`VITE_ENABLE_MOCK_API=true`). Use the pre-filled credentials on the login screen or any email/password where password ≥ 6 chars.

### Switching to a real API

1. Set `VITE_ENABLE_MOCK_API=false` in `.env`
2. Set `VITE_API_BASE_URL` to your backend
3. Implement endpoints in `src/api/endpoints.ts` — services already wire them up

No UI changes required.

## Features built in

- **Protected routes** with redirect-back-to-intended-destination after login
- **Persisted auth** via Zustand persist + localStorage; restores session on reload
- **⌘K / Ctrl+K** global stock search with keyboard navigation (arrows + enter)
- **Live market status pill** that knows NSE/BSE hours in IST and updates every minute
- **Watchlist** with optimistic local persistence, sync-ready
- **Collapsible sidebar** (persists) + **mobile drawer** with backdrop
- **Code-split routes** via `React.lazy` — each page is a separate chunk
- **Manual chunk splitting** in Vite config groups vendor bundles
- **Indian number formatting** (lakhs/crores) throughout
- **Reduced-motion** respected via CSS media query
- **Visible focus rings** for keyboard navigation
- **Skeleton loaders** during query fetches, never empty white screens
- **404 handler** with a brand-voiced message
- **React Query devtools** in development

## Scripts

```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # tsc --noEmit
```

## Disclaimer

This is a frontend application. Market data shown in the mock layer is illustrative and not connected to any live feed. Investments in securities are subject to market risks.
