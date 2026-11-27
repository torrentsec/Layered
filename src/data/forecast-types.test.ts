// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it, vi } from 'vitest';
import { fetchForecast, forecastUrl, HOURLY_VARS, parseForecast, type Forecast } from './forecast-types';
import { OPEN_METEO_LONDON, OPEN_METEO_LONDON_LEGACY } from './openmeteo.fixture';

const SCIENCE_VARS = [
  'relative_humidity_2m',
  'cloud_cover',
  'shortwave_radiation',
  'direct_radiation',
  'diffuse_radiation',
  'direct_normal_irradiance',
];

describe('forecastUrl', () => {
  it('asks for humidity, cloud and radiation in the one request', () => {
    const hourly = new URL(forecastUrl(51.5, -0.12)).searchParams.get('hourly')!.split(',');
    expect(hourly).toEqual([...HOURLY_VARS]);
    for (const v of SCIENCE_VARS) expect(hourly).toContain(v);
  });
});

describe('parseForecast', () => {
  const f = parseForecast(OPEN_METEO_LONDON, 7);

  it('reads humidity, cloud and the four radiation series', () => {
    expect(f.hours[3]).toMatchObject({ time: '2026-11-26T09:00', rh: 82, cloud: 95, ghi: 58, direct: 14, diffuse: 44, dni: 75.3 });
  });

  it('keeps 0 W/m² at night as a real value', () => {
    expect(f.hours[0]).toMatchObject({ ghi: 0, direct: 0, diffuse: 0, dni: 0, isDay: false });
  });

  it('leaves gaps undefined instead of 0', () => {
    const gap = f.hours[4];
    for (const k of ['rh', 'ghi', 'direct', 'diffuse', 'dni'] as const) expect(gap[k]).toBeUndefined();
    expect(gap.cloud).toBe(100);
  });

  it('parses documents without the new series', () => {
    const old = parseForecast(OPEN_METEO_LONDON_LEGACY, 7);
    expect(old.hours).toHaveLength(5);
    for (const h of old.hours) {
      for (const k of ['rh', 'cloud', 'ghi', 'direct', 'diffuse', 'dni'] as const) expect(h[k]).toBeUndefined();
    }
    expect(old.hours.map(({ time, temp, feels }) => ({ time, temp, feels }))).toEqual(
      f.hours.map(({ time, temp, feels }) => ({ time, temp, feels })),
    );
  });

  it('keeps a cached copy saved before the new fields valid', () => {
    // localStorage holds JSON, where undefined fields vanish, so an old copy and a gap look the same.
    const cached = JSON.parse(JSON.stringify(parseForecast(OPEN_METEO_LONDON_LEGACY, 7))) as Forecast;
    expect(Object.keys(cached.hours[0])).not.toContain('rh');
    expect(cached.hours[0].rh).toBeUndefined();
    expect(cached.hours[0].temp).toBe(3.4);
  });
});

describe('fetchForecast', () => {
  it('makes one request and returns the new fields', async () => {
    const f = vi.fn(async () => Response.json(OPEN_METEO_LONDON));
    const out = await fetchForecast(51.5, -0.12, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
    expect(out.hours[2]).toMatchObject({ rh: 85, cloud: 81, ghi: 12 });
  });
});
