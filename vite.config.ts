import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@api': path.resolve(__dirname, './src/api'),
      '@store': path.resolve(__dirname, './src/store'),
      '@config': path.resolve(__dirname, './src/config'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@routes': path.resolve(__dirname, './src/routes'),
    },
  },
  server: {
    host: true, // listen on all network interfaces so phones on the same WiFi can reach it, not just localhost
    port: 5173,
    open: true,
    allowedHosts: true,
    proxy: {
      // Forwards to the broker-integration backend (backend/) so the
      // frontend can call relative /api/... paths in both dev and prod.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serves the production build (dist/) — bundled and
  // minified, far fewer requests than the dev server's unbundled ESM
  // modules, so it's much faster/more reliable over a real WiFi hop (phone)
  // instead of localhost. Needs its own host/proxy config — it does not
  // inherit `server` above.
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'data-vendor': ['@tanstack/react-query', 'zustand', 'axios'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'recharts'],
        },
      },
    },
  },
});
