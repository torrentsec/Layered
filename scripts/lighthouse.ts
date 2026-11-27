// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Lighthouse against a served `dist`, on mobile emulation, with a fixture
// forecast seeded so the run never depends on Open-Meteo. Exits non-zero
// when a category misses its budget or the app stops being installable.
//
//   npm run build && npx vite preview --port 4173 &
//   CHROME_PATH=/path/to/chrome npm run lighthouse -- http://localhost:4173
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type Budgets = Record<string, number>;
export type Scores = Record<string, number>;

const PLACE = { id: 'lh', name: 'London', detail: 'England', lat: 51.51, lon: -0.13, kind: 'home' };

/** Cold, showery days in the app's parsed shape, starting at today's midnight UTC. */
export function fixtureForecast(now: number) {
  const start = Math.floor(now / 864e5) * 864e5;
  const hours = [];
  for (let i = 0; i < 16 * 24; i++) {
    const t = new Date(start + i * 36e5);
    const h = t.getUTCHours();
    const day = Math.floor(i / 24);
    const temp = Math.round((6 + 5 * Math.sin(((h - 9) / 24) * 2 * Math.PI) - day * 0.3) * 10) / 10;
    const wet = h >= 16 && h <= 19 && day % 2 === 0;
    hours.push({
      time: t.toISOString().slice(0, 16),
      temp,
      feels: temp - 3,
      precipProb: wet ? 70 : 10,
      precip: wet ? 0.6 : 0,
      snow: 0,
      wind: 18,
      gusts: 35,
      uv: h > 10 && h < 14 ? 1 : 0,
      isDay: h >= 7 && h < 16,
      code: wet ? 80 : 2,
      visibility: 20000,
    });
  }
  const days = [];
  for (let d = 0; d < 16; d++) {
    const date = new Date(start + d * 864e5).toISOString().slice(0, 10);
    days.push({
      date,
      sunrise: `${date}T07:32`,
      sunset: `${date}T15:58`,
      tempMax: 11 - d * 0.3,
      tempMin: 1 - d * 0.3,
      feelsMax: 8 - d * 0.3,
      feelsMin: -2 - d * 0.3,
      precipProbMax: d % 2 ? 10 : 70,
      precipSum: d % 2 ? 0 : 2.4,
      uvMax: 1,
      gustMax: 35,
      code: d % 2 ? 2 : 80,
    });
  }
  return {
    lat: PLACE.lat,
    lon: PLACE.lon,
    timezone: 'UTC',
    utcOffsetSeconds: 0,
    hours,
    days,
    fetchedAt: now,
    source: 'open-meteo',
  };
}

/** Middle value per category, so one noisy run neither passes nor fails the build. */
export function medianScores(runs: Scores[]): Scores {
  const out: Scores = {};
  for (const id of Object.keys(runs[0] ?? {})) {
    const xs = runs.map((r) => r[id]).sort((a, b) => a - b);
    const m = xs.length >> 1;
    out[id] = xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
  }
  return out;
}

/** One line per miss; a category Lighthouse didn't score counts as a miss. */
export function budgetFailures(scores: Scores, budgets: Budgets): string[] {
  return Object.entries(budgets)
    .filter(([id, min]) => !(scores[id] >= min))
    .map(([id, min]) => `${id}: ${scores[id] === undefined ? 'not scored' : Math.round(scores[id] * 100)} < ${Math.round(min * 100)}`);
}

// Runs in the page before any app code, on every navigation Lighthouse makes.
function seed(origin: string, place: typeof PLACE, forecast: string): void {
  const { location, localStorage } = globalThis as unknown as {
    location: { origin: string };
    localStorage: { setItem(k: string, v: string): void };
  };
  if (location.origin !== origin) return;
  const f = JSON.parse(forecast);
  f.fetchedAt = Date.now();
  localStorage.setItem('layered:v1:places', JSON.stringify([place]));
  localStorage.setItem('layered:v1:settings', JSON.stringify({ placeId: place.id }));
  localStorage.setItem('layered:v1:onboarded', 'true');
  localStorage.setItem(`layered:fc:${place.lat.toFixed(2)},${place.lon.toFixed(2)}`, JSON.stringify(f));
}

function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/pw-browsers/chromium-1243/chrome-linux/chrome',
  ];
  const hit = candidates.find((p) => p && existsSync(p));
  if (!hit) throw new Error('No Chrome found: set CHROME_PATH');
  return hit;
}

async function main(): Promise<void> {
  const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
  const runs = Number(process.env.LH_RUNS ?? 3);
  const outDir = process.env.LH_OUT ?? '.lighthouse';
  const budgets = JSON.parse(readFileSync(new URL('../lighthouse-budgets.json', import.meta.url), 'utf8')) as Budgets;
  mkdirSync(outDir, { recursive: true });

  const { default: lighthouse } = await import('lighthouse');
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(seed, new URL(base).origin, PLACE, JSON.stringify(fixtureForecast(Date.now())));
    // Answers the air-quality call (and anything else bound for Open-Meteo) locally.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (new URL(req.url()).hostname.endsWith('open-meteo.com')) {
        void req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ hourly: { time: [], european_aqi: [] } }),
        });
      } else void req.continue();
    });

    const all: Scores[] = [];
    for (let i = 0; i < runs; i++) {
      const flags = {
        output: ['html', 'json'] as ('html' | 'json')[],
        logLevel: 'error' as const,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      };
      const result = await lighthouse(`${base}/`, flags, undefined, page);
      if (!result) throw new Error('Lighthouse returned no result');
      const scores: Scores = {};
      for (const [id, cat] of Object.entries(result.lhr.categories)) scores[id] = cat.score ?? 0;
      all.push(scores);
      const [html, json] = result.report as string[];
      writeFileSync(join(outDir, `run-${i + 1}.html`), html);
      writeFileSync(join(outDir, `run-${i + 1}.json`), json);
      const a = result.lhr.audits;
      console.log(
        `run ${i + 1}:`,
        Object.entries(scores).map(([id, s]) => `${id} ${Math.round(s * 100)}`).join(', '),
        `| LCP ${a['largest-contentful-paint']?.displayValue} TBT ${a['total-blocking-time']?.displayValue} CLS ${a['cumulative-layout-shift']?.displayValue}`,
      );
    }

    await page.goto(`${base}/`, { waitUntil: 'networkidle0' });
    const cdp = await page.createCDPSession();
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    const median = medianScores(all);
    const failures = budgetFailures(median, budgets);
    failures.push(...installabilityErrors.map((e) => `installable: ${e.errorId}`));
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ median, budgets, runs: all, installabilityErrors }, null, 2));

    console.log('median:', Object.entries(median).map(([id, s]) => `${id} ${Math.round(s * 100)}`).join(', '));
    console.log(installabilityErrors.length ? 'not installable' : 'installable');
    if (failures.length) {
      console.error(`Below budget:\n  ${failures.join('\n  ')}`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
