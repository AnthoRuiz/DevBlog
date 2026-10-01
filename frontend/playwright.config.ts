import { defineConfig } from '@playwright/test';

// End-to-end tests against the DEVELOPMENT stack: the Vite dev server (started here if it is not
// running) proxying to the dev backend on :8001. Never point this at production: tests create and
// delete posts. Admin credentials come from ../.env.dev (or E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Tests share one dev database (featured slots, the review queue): run them one at a time
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    // The Chrome already installed on the machine; no browser download needed
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
