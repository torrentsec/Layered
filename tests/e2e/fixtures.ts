// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { test as base, type Page } from '@playwright/test';

/** Mid-morning in London, so Today has a full day ahead and the evening rain is still to come. */
export const NOW = new Date('2026-11-26T08:20:00Z');

const START = Date.UTC(2026, 10, 26, 0);
const DAYS = 16;

/** Cold and showery: about 1–11°, gusty, with rain every other evening. */
export function openMeteoForecast() {
  const hourly = {
    time: [] as string[],
    temperature_2m: [] as number[],
    apparent_temperature: [] as number[],
    precipitation_probability: [] as number[],
    precipitation: [] as number[],
    snowfall: [] as number[],
    weather_code: [] as number[],
    wind_speed_10m: [] as number[],
    wind_gusts_10m: [] as number[],
    uv_index: [] as number[],
    is_day: [] as number[],
    visibility: [] as number[],
  };
  for (let i = 0; i < DAYS * 24; i++) {
    const d = new Date(START + i * 3_600_000);
    const h = d.getUTCHours();
    const day = Math.floor(i / 24);
    const t = 6 + 5 * Math.sin(((h - 9) / 24) * 2 * Math.PI) - day * 0.3;
    const wet = h >= 16 && h <= 19 && day % 2 === 0;
    hourly.time.push(d.toISOString().slice(0, 16));
    hourly.temperature_2m.push(t);
    hourly.apparent_temperature.push(t - 3);
    hourly.precipitation_probability.push(wet ? 70 : 10);
    hourly.precipitation.push(wet ? 0.6 : 0);
    hourly.snowfall.push(0);
    hourly.weather_code.push(wet ? 80 : 2);
    hourly.wind_speed_10m.push(18);
    hourly.wind_gusts_10m.push(35);
    hourly.uv_index.push(h > 10 && h < 14 ? 1 : 0);
    hourly.is_day.push(h >= 7 && h < 16 ? 1 : 0);
    hourly.visibility.push(20_000);
  }
  const daily = {
    time: [] as string[],
    sunrise: [] as string[],
    sunset: [] as string[],
    temperature_2m_max: [] as number[],
    temperature_2m_min: [] as number[],
    apparent_temperature_max: [] as number[],
    apparent_temperature_min: [] as number[],
    precipitation_probability_max: [] as number[],
    precipitation_sum: [] as number[],
    uv_index_max: [] as number[],
    wind_gusts_10m_max: [] as number[],
    weather_code: [] as number[],
  };
  for (let d = 0; d < DAYS; d++) {
    const date = new Date(START + d * 86_400_000).toISOString().slice(0, 10);
    daily.time.push(date);
    daily.sunrise.push(`${date}T07:32`);
    daily.sunset.push(`${date}T15:58`);
    daily.temperature_2m_max.push(11 - d * 0.3);
    daily.temperature_2m_min.push(1 - d * 0.3);
    daily.apparent_temperature_max.push(8 - d * 0.3);
    daily.apparent_temperature_min.push(-2 - d * 0.3);
    daily.precipitation_probability_max.push(d % 2 ? 10 : 70);
    daily.precipitation_sum.push(d % 2 ? 0 : 2.4);
    daily.uv_index_max.push(1);
    daily.wind_gusts_10m_max.push(35);
    daily.weather_code.push(d % 2 ? 2 : 80);
  }
  return { latitude: 51.51, longitude: -0.13, timezone: 'Europe/London', utc_offset_seconds: 0, hourly, daily };
}

export const PLACE = { id: 'p1', name: 'London', detail: 'England', lat: 51.51, lon: -0.13, kind: 'home' };

const GEOCODE = {
  results: [
    { id: 1, name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.51, longitude: -0.13 },
    { id: 2, name: 'Lisbon', admin1: 'Lisbon', country: 'Portugal', latitude: 38.72, longitude: -9.14 },
  ],
};

/**
 * Every outside request is answered here, so no test reaches a real weather
 * service or depends on the Pages Functions, which `vite preview` doesn't run.
 */
export async function mockNetwork(page: Page): Promise<void> {
  const forecast = openMeteoForecast();
  await page.route(/open-meteo\.com/, (route) => {
    const url = route.request().url();
    if (url.includes('geocoding')) {
      const name = new URL(url).searchParams.get('name')?.toLowerCase() ?? '';
      return route.fulfill({ json: { results: GEOCODE.results.filter((r) => r.name.toLowerCase().startsWith(name.slice(0, 3))) } });
    }
    if (url.includes('air-quality')) {
      return route.fulfill({
        json: { hourly: { time: forecast.hourly.time.slice(0, 48), european_aqi: Array(48).fill(45), grass_pollen: Array(48).fill(5) } },
      });
    }
    return route.fulfill({ json: forecast });
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: { error: 'Not available in tests' } }));
}

/** Seeds localStorage before the app boots. Keys and shapes follow `src/data/store.ts`. */
export async function seed(page: Page, values: Record<string, unknown>): Promise<void> {
  const entries = JSON.stringify(Object.entries(values).map(([k, v]) => [`layered:v1:${k}`, JSON.stringify(v)]));
  await page.addInitScript({
    content: `if (!sessionStorage.getItem('e2e-seeded')) { for (const [k, v] of ${entries}) localStorage.setItem(k, v); sessionStorage.setItem('e2e-seeded', '1'); }`,
  });
}

/** A returning user with a Home place and a winter wardrobe. */
export const RETURNING = {
  places: [PLACE],
  settings: { placeId: 'p1' },
  onboarded: true,
  inventory: {
    thermal: { counts: { medium: 2 } },
    longsleeve: { counts: { thin: 3, medium: 2 } },
    jumper: { counts: { medium: 2, thick: 1 } },
    coat: { counts: { thick: 1 }, nickname: 'navy wool coat' },
    'waterproof-jacket': { counts: { thin: 1 } },
    jeans: { counts: { medium: 2 } },
    boots: { counts: { medium: 1 } },
    gloves: { counts: { medium: 1 } },
    hat: { counts: { medium: 1 } },
    umbrella: { counts: { medium: 1 } },
  },
};

export const test = base.extend<object>({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await mockNetwork(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
