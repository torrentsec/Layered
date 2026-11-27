// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // README screenshots are rewritten only on request, never as a side effect of a test run.
  grepInvert: process.env.SCREENSHOTS ? undefined : /@screenshots/,
  use: {
    baseURL,
    // The service worker would answer from its precache and bypass the mocked routes.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },
  projects: [{ name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    cwd: '../..',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
