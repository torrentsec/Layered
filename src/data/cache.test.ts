// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedForecast, getForecast } from './cache';
import { PACK_VERSION } from './forecast-pack';
import type { Forecast } from './forecast-types';

const metno: Forecast = {
  lat: 51.51,
  lon: -0.13,
  timezone: 'Europe/London',
  utcOffsetSeconds: 0,
  hours: [{ time: '2026-11-26T08:00', temp: 5, feels: 2, precipProb: 0, precip: 0, snow: 0, wind: 10, gusts: 15, uv: 0, isDay: true, code: 3 }],
  days: [],
  fetchedAt: 5,
  source: 'met-norway',
};

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('getForecast fallback', () => {
  it('tries MET Norway when Open-Meteo fails', async () => {
    const f = vi.fn(async (url: string) =>
      url.startsWith('/api/forecast') ? new Response(JSON.stringify(metno)) : new Response('down', { status: 500 }),
    );
    vi.stubGlobal('fetch', f);
    const r = await getForecast(51.51, -0.13, true);
    expect(r).toEqual({ forecast: metno, stale: false });
    expect(f.mock.calls[1][0]).toMatch(/^\/api\/forecast\?lat=51\.51&lon=-0\.13&tz=/);
  });

  it('uses the stale copy, in the saved place zone, when both fail', async () => {
    const old = { ...metno, timezone: 'Asia/Tokyo', source: 'open-meteo' as const };
    store.set('layered:fc:51.51,-0.13', JSON.stringify(old));
    const f = vi.fn(async () => new Response('down', { status: 500 }));
    vi.stubGlobal('fetch', f);
    const r = await getForecast(51.51, -0.13, true);
    expect(r).toEqual({ forecast: old, stale: true });
    expect(String((f.mock.calls as unknown as string[][])[1][0])).toContain('tz=Asia%2FTokyo');
  });

  it('saves the columns format and reads it back as the same forecast', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/api/forecast') ? new Response(JSON.stringify(metno)) : new Response('down', { status: 500 }))));
    await getForecast(51.51, -0.13, true);
    expect(JSON.parse(store.get('layered:fc:51.51,-0.13')!).v).toBe(PACK_VERSION);
    expect(cachedForecast(51.51, -0.13)).toEqual(metno);
  });
});
