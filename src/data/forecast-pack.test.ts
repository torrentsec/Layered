// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { HOURLY_VARS, parseForecast, type Forecast } from './forecast-types';
import { PACK_VERSION, packForecast, unpackForecast } from './forecast-pack';

type Raw = Parameters<typeof parseForecast>[0];

/** A full 16-day Open-Meteo answer with values at the API's own precision, deterministic so sizes are repeatable. */
function sixteenDays(lat = 51.51, lon = -0.13): Raw {
  let seed = Math.round((lat + 90) * 1000 + (lon + 180));
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const one = (n: number) => Math.round(n * 10) / 10;
  const n = 16 * 24;
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 26, i));
    return d.toISOString().slice(0, 16);
  });
  const hourOf = (i: number) => i % 24;
  const day = (i: number) => hourOf(i) >= 8 && hourOf(i) < 16;
  const sun = (i: number) => (day(i) ? Math.sin(((hourOf(i) - 8) / 8) * Math.PI) : 0);
  const col = (f: (i: number) => number | null) => time.map((_, i) => f(i));
  const hourly: Record<string, (number | string | null)[]> = {
    time,
    temperature_2m: col((i) => one(4 + 4 * sun(i) + rnd() * 3)),
    apparent_temperature: col((i) => one(0 + 4 * sun(i) + rnd() * 3)),
    precipitation_probability: col(() => Math.round(rnd() * 100)),
    precipitation: col(() => (rnd() < 0.6 ? 0 : one(rnd() * 3))),
    snowfall: col(() => 0),
    weather_code: col(() => [0, 1, 2, 3, 61, 80][Math.floor(rnd() * 6)]),
    wind_speed_10m: col(() => one(5 + rnd() * 25)),
    wind_gusts_10m: col(() => one(15 + rnd() * 40)),
    uv_index: col((i) => one(sun(i) * 1.2)),
    is_day: col((i) => (day(i) ? 1 : 0)),
    visibility: col(() => one(5000 + rnd() * 40000)),
    relative_humidity_2m: col(() => Math.round(60 + rnd() * 40)),
    cloud_cover: col(() => Math.round(rnd() * 100)),
    shortwave_radiation: col((i) => one(sun(i) * 250 * rnd())),
    direct_radiation: col((i) => one(sun(i) * 150 * rnd())),
    diffuse_radiation: col((i) => one(sun(i) * 100 * rnd())),
    direct_normal_irradiance: col((i) => one(sun(i) * 400 * rnd())),
  };
  const dates = Array.from({ length: 16 }, (_, d) => time[d * 24].slice(0, 10));
  const dcol = (f: (d: number) => number) => dates.map((_, d) => f(d));
  return {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/London',
    utc_offset_seconds: 0,
    hourly: hourly as Raw['hourly'],
    daily: {
      time: dates,
      sunrise: dates.map((d) => `${d}T07:35`),
      sunset: dates.map((d) => `${d}T15:58`),
      temperature_2m_max: dcol(() => one(8 + rnd() * 3)),
      temperature_2m_min: dcol(() => one(2 + rnd() * 3)),
      apparent_temperature_max: dcol(() => one(5 + rnd() * 3)),
      apparent_temperature_min: dcol(() => one(-1 + rnd() * 3)),
      precipitation_probability_max: dcol(() => Math.round(rnd() * 100)),
      precipitation_sum: dcol(() => one(rnd() * 8)),
      uv_index_max: dcol(() => one(rnd() * 1.5)),
      wind_gusts_10m_max: dcol(() => one(30 + rnd() * 30)),
      weather_code: dcol(() => 80),
    },
  };
}

const roundTrip = (f: Forecast) => unpackForecast(JSON.parse(JSON.stringify(packForecast(f))));
/** What the pre-Sprint 6 cache wrote: the Forecast as it came from the parser. */
const legacy = (f: Forecast) => JSON.parse(JSON.stringify(f)) as Forecast;

describe('packForecast', () => {
  const f = parseForecast(sixteenDays(), 1_800_000_000_000);

  it('requests every hourly variable the generator fills', () => {
    expect(Object.keys(sixteenDays().hourly).filter((k) => k !== 'time').sort()).toEqual([...HOURLY_VARS].sort());
  });

  it('gives back exactly the hours, days and metadata that went in', () => {
    expect(f.hours).toHaveLength(384);
    expect(roundTrip(f)).toEqual(legacy(f));
  });

  it('keeps gaps in the science inputs as gaps, not zeros', () => {
    const gappy: Forecast = { ...f, hours: f.hours.map((h, i) => (i === 3 ? { ...h, rh: undefined, ghi: undefined } : h)) };
    const back = roundTrip(gappy)!;
    expect(back.hours[3].rh).toBeUndefined();
    expect(back.hours[3].ghi).toBeUndefined();
    expect(back.hours[4].rh).toBe(f.hours[4].rh);
  });

  it('leaves out a science column nobody sent', () => {
    const plain: Forecast = { ...f, hours: f.hours.map(({ dni: _dni, ...h }) => h) };
    const p = packForecast(plain);
    expect(p.cols.dni).toBeUndefined();
    expect(roundTrip(plain)!.hours[10]).not.toHaveProperty('dni');
  });

  it('stores the times when the hours are not one hourly run', () => {
    const sparse: Forecast = { ...f, source: 'met-norway', hours: [f.hours[0], f.hours[1], f.hours[7], f.hours[13]] };
    const p = packForecast(sparse);
    expect(p.times).toEqual(sparse.hours.map((h) => h.time));
    expect(roundTrip(sparse)).toEqual(legacy(sparse));
  });

  it('crosses a clock change by wall-clock hour without dropping or repeating one', () => {
    const t = ['2026-03-29T00:00', '2026-03-29T01:00', '2026-03-29T02:00', '2026-03-29T03:00'];
    const hours = t.map((time, i) => ({ ...f.hours[i], time }));
    expect(packForecast({ ...f, hours }).times).toBeUndefined();
    expect(roundTrip({ ...f, hours })!.hours.map((h) => h.time)).toEqual(t);
  });

  it('trims float noise but no real precision', () => {
    const noisy: Forecast = { ...f, hours: [{ ...f.hours[0], temp: 0.1 + 0.2, precip: 0.25 }] };
    expect(roundTrip(noisy)!.hours[0]).toMatchObject({ temp: 0.3, precip: 0.25 });
  });

  it('handles an empty forecast', () => {
    const empty: Forecast = { ...f, hours: [], days: [] };
    expect(roundTrip(empty)).toEqual(legacy(empty));
  });
});

describe('unpackForecast', () => {
  const f = parseForecast(sixteenDays(), 5);

  it('still reads a forecast saved before this version, one object per hour', () => {
    expect(unpackForecast(legacy(f))).toEqual(legacy(f));
  });

  it('rejects anything that is neither format', () => {
    expect(unpackForecast(null)).toBeNull();
    expect(unpackForecast({})).toBeNull();
    expect(unpackForecast('x')).toBeNull();
    expect(unpackForecast({ v: PACK_VERSION + 1, cols: {} })).toBeNull();
  });
});

describe('twenty saved places', () => {
  // Browsers give an origin about 5 million UTF-16 characters of localStorage; keys count too.
  const QUOTA_CHARS = 5_000_000;
  const places = Array.from({ length: 20 }, (_, i) => parseForecast(sixteenDays(40 + i, -5 + i), 1_800_000_000_000));
  const size = (o: unknown, i: number) => `layered:fc:${places[i].lat.toFixed(2)},${places[i].lon.toFixed(2)}`.length + JSON.stringify(o).length;

  it('fit in under a fifth of the quota with full 16-day forecasts', () => {
    const total = places.reduce((a, p, i) => a + size(packForecast(p), i), 0);
    expect(total).toBeLessThan(QUOTA_CHARS / 5);
  });

  it('take less than half the space the old format did', () => {
    const before = places.reduce((a, p, i) => a + size(p, i), 0);
    const after = places.reduce((a, p, i) => a + size(packForecast(p), i), 0);
    expect(after).toBeLessThan(before / 2);
  });
});
