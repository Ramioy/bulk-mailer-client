import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The client calls `/api/...`; the dev server forwards it to the backend (BACKEND_URL, default http://localhost:3000)
 * on the same origin. Same-origin keeps the SSE stream working: the backend's SSE answer does not carry CORS headers
 * (see README, "Pendientes del backend").
 */
const backend = process.env.BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
