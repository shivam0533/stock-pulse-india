/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_ENABLE_MOCK_API: string;
  /** Developer-only — see src/config/devTestingMode.ts. Never set outside local development. */
  readonly VITE_DEV_TESTING_MODE?: string;
  /** Base URL of the broker-integration backend (backend/), e.g. "https://your-backend.up.railway.app". Unset/empty in local dev, where Vite's own proxy forwards relative /api/... paths to localhost:4000 instead (see vite.config.ts). Required when the frontend and backend are deployed to different origins (e.g. Vercel + Railway). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
