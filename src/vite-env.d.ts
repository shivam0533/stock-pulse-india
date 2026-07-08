/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Real backend (Angel One broker integration) origin, e.g. a Railway/Render URL. Empty/unset in local dev — falls back to the Vite proxy at /api. */
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_ENABLE_MOCK_API: string;
  /** Developer-only — see src/config/devTestingMode.ts. Never set outside local development. */
  readonly VITE_DEV_TESTING_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
