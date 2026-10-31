import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the REAL backend with its fake adapters (contracts and email): `pnpm test:e2e` starts it on its own
 * database (e2e/backend/start-backend.mjs) and the frontend dev server, which proxies `/api` to it.
 * Needs a PostgreSQL server reachable at E2E_DATABASE_URL (default: the backend's `pnpm db:up`, port 5432).
 */
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 3100);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5174);
const webOrigin = `http://localhost:${webPort}`;
// The browsers of this environment are preinstalled; elsewhere Playwright's own download is used.
const chromium = process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'e2e',
  // One backend and shared batches: tests run one after the other.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: webOrigin,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(existsSync(chromium) && !process.env.PLAYWRIGHT_BROWSERS_PATH ? { launchOptions: { executablePath: chromium } } : {}),
  },
  webServer: [
    {
      command: 'node e2e/backend/start-backend.mjs',
      url: `http://127.0.0.1:${backendPort}/health`,
      env: { E2E_BACKEND_PORT: String(backendPort), E2E_WEB_ORIGIN: webOrigin },
      timeout: 300_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm exec vite',
      url: webOrigin,
      env: { WEB_PORT: String(webPort), BACKEND_URL: `http://127.0.0.1:${backendPort}` },
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
