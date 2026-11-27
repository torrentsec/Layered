// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Runs axe-core (WCAG 2.2 A and AA rules) against every screen and sheet of the
// built app, in light and dark, at 390px and 320px. Serves `dist` with
// `vite preview`, so run `npm run build` first. Exits non-zero on any serious
// or critical violation. Usage: npm run test:a11y [-- --verbose]

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { forecast, airQuality, geocoding } from './fixtures.mjs';

const PORT = Number(process.env.A11Y_PORT ?? 4599);
const BASE = `http://localhost:${PORT}`;
const VERBOSE = process.argv.includes('--verbose');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(['serious', 'critical']);
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const HOME = { id: 'p1', name: 'London', detail: 'England', lat: 51.51, lon: -0.13, kind: 'home' };
const TRIP = {
  id: 't1',
  name: 'Edinburgh',
  stops: [{ id: 's1', place: { id: 'p2', name: 'Edinburgh', detail: 'Scotland', lat: 55.95, lon: -3.19 }, start: '2026-11-28', end: '2026-11-30' }],
  activities: ['walking'],
  checked: {},
  createdAt: 0,
};

const seeded = { 'layered:v1:places': [HOME], 'layered:v1:settings': { placeId: 'p1' } };

/** Each case: a route, optional storage seed, and an optional step that opens a sheet. */
const CASES = [
  { name: 'onboarding step 1', hash: '', storage: {} },
  { name: 'onboarding step 2', hash: '', storage: {}, act: (p) => p.getByRole('button', { name: 'Skip this step' }).click() },
  {
    name: 'onboarding step 3',
    hash: '',
    storage: {},
    act: async (p) => {
      await p.getByRole('button', { name: 'Skip this step' }).click();
      await p.getByRole('button', { name: 'Skip this step' }).click();
    },
  },
  { name: 'today', hash: '#/today' },
  { name: 'today why-this', hash: '#/today', act: (p) => p.getByRole('button', { name: 'Why this?' }).click() },
  { name: 'today place sheet', hash: '#/today', act: (p) => p.getByRole('button', { name: /Change place/ }).click() },
  { name: 'week', hash: '#/week' },
  { name: 'week day swiper', hash: '#/week/2026-11-27' },
  { name: 'trip list empty', hash: '#/trip' },
  { name: 'trip editor', hash: '#/trip', act: (p) => p.getByRole('button', { name: 'Plan a trip' }).click() },
  { name: 'trip list', hash: '#/trip', storage: { ...seeded, 'layered:v1:trips': [TRIP] } },
  { name: 'trip detail', hash: '#/trip/t1', storage: { ...seeded, 'layered:v1:trips': [TRIP] } },
  { name: 'wardrobe', hash: '#/wardrobe' },
  {
    name: 'wardrobe details sheet',
    hash: '#/wardrobe',
    act: async (p) => {
      await p.locator('button.row-item[aria-expanded]').first().click();
      await p.getByRole('button', { name: /details/i }).first().click();
    },
  },
  { name: 'settings', hash: '#/settings' },
  { name: 'install hint', hash: '#/today', ios: true },
  {
    name: 'toast',
    hash: '#/today',
    act: async (p) => {
      for (let i = 0; i < 7; i++) await p.locator('.hero .temp-circle').click();
    },
  },
];

/** What must be on screen before scanning, so a broken step can't pass as an empty page. */
const EXPECT = {
  'onboarding step 1': '#ob-h',
  'onboarding step 2': '#ob-h',
  'onboarding step 3': '#ob-h',
  today: '.readout',
  'today why-this': 'dialog[open] .why',
  'today place sheet': 'dialog[open]',
  week: 'a.day-row',
  'week day swiper': '.swiper .readout',
  'trip list empty': '.empty',
  'trip editor': 'dialog[open]',
  'trip list': 'a[href="#/trip/t1"]',
  'trip detail': '.trip-day',
  wardrobe: '.wd-progress',
  'wardrobe details sheet': 'dialog[open] .segmented',
  settings: '.large-title',
  'install hint': 'dialog[open]',
  toast: '.toast:popover-open',
};

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(200);
  }
  throw new Error(`vite preview did not start on ${BASE}`);
}

async function mockNetwork(ctx) {
  await ctx.route(/open-meteo\.com/, (r) => {
    const u = r.request().url();
    if (u.includes('geocoding')) return r.fulfill({ json: geocoding() });
    if (u.includes('air-quality')) return r.fulfill({ json: airQuality() });
    if (u.includes('archive')) return r.fulfill({ status: 503, body: '' });
    return r.fulfill({ json: forecast() });
  });
  await ctx.route(/api\.met\.no|\/api\//, (r) => r.fulfill({ status: 503, body: '' }));
}

async function runCase(browser, c, scheme, width) {
  const ctx = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width, height: 844 },
    colorScheme: scheme,
    reducedMotion: 'reduce',
    ...(c.ios ? { userAgent: IPHONE_UA, hasTouch: true, isMobile: true } : {}),
  });
  await mockNetwork(ctx);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(process.env.NOW || '2026-11-26T08:20:00Z'));
  const storage = c.storage ?? seeded;
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('a11y-seeded')) return;
    sessionStorage.setItem('a11y-seeded', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v));
  }, storage);
  await page.goto(`${BASE}/${c.hash}`);
  await page.waitForLoadState('networkidle');
  if (c.act) await c.act(page);
  await page.locator(EXPECT[c.name]).first().waitFor({ state: 'visible', timeout: 5000 });
  // Let sheets finish opening and toasts appear before scanning.
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await ctx.close();
  return { violations, overflow };
}

// Vite's own entry rather than npx, so kill() stops the server and not just a wrapper.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'ignore', 'inherit'] });
server.on('exit', (code) => {
  if (code) {
    console.error(`vite preview exited with ${code}; is port ${PORT} free? Set A11Y_PORT to use another.`);
    process.exit(1);
  }
});
let failures = 0;
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const c of CASES) {
    for (const scheme of ['light', 'dark']) {
      for (const width of [390, 320]) {
        const label = `${c.name} · ${scheme} · ${width}px`;
        const { violations, overflow } = await runCase(browser, c, scheme, width);
        const blocking = violations.filter((v) => BLOCKING.has(v.impact));
        const other = violations.filter((v) => !BLOCKING.has(v.impact));
        if (overflow > 0) {
          failures++;
          console.log(`FAIL ${label}: page scrolls sideways by ${overflow}px`);
        }
        if (blocking.length) failures++;
        console.log(`${blocking.length ? 'FAIL' : 'ok  '} ${label}${other.length ? ` (${other.length} minor)` : ''}`);
        for (const v of VERBOSE ? violations : blocking) {
          console.log(`     [${v.impact}] ${v.id}: ${v.help}`);
          for (const n of v.nodes.slice(0, 5)) console.log(`       ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
        }
      }
    }
  }
  await browser.close();
} finally {
  server.removeAllListeners('exit');
  server.kill();
}
console.log(failures ? `\n${failures} failing checks` : '\nNo serious or critical violations.');
process.exit(failures ? 1 : 0);
