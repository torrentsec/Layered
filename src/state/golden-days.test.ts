// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Sprint 5 golden days (docs/sprints/sprint-05.md), written by the PO before
// the science engine existed. Each runs an Open-Meteo answer through
// parseForecast and planDay, the path Today takes. The science engine must
// give the PO's verdict; the band engine's answer is recorded for comparison.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bandRank } from '../engine/bands';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { CATALOGUE, category, type Inventory } from '../engine/inventory';
import type { Activity, Advice } from '../engine/types';
import { DAILY_VARS, parseForecast } from '../data/forecast-types';
import { DEFAULT_SETTINGS, type Settings } from '../data/store';
import { planDay } from './advice';
import { feelsInClothes } from '../data/feels-in-clothes';
import { comfortTime } from '../engine/science/comfort-time';
import { hourToWeather } from '../engine/science/weather';

interface Conditions {
  /** Local start of the walk, YYYY-MM-DDTHH:00. */
  time: string;
  lat: number;
  lon: number;
  utcOffset: number;
  ta: number;
  /** Open-Meteo apparent temperature for these inputs (Steadman, no radiation). */
  feels: number;
  windKmh: number;
  gustKmh: number;
  rh: number;
  cloud: number;
  precipProb: number;
  precip: number;
  code: number;
  uv: number;
  /** W/m²: global, direct and diffuse horizontal, direct normal. */
  rad: [number, number, number, number];
}

// Three identical hours around the walk, so the window and its neighbours agree.
function openMeteo(c: Conditions) {
  const hour = Number(c.time.slice(11, 13));
  const times = [hour - 1, hour, hour + 1].map((h) => `${c.time.slice(0, 11)}${String(h).padStart(2, '0')}:00`);
  const same = <T>(v: T) => times.map(() => v);
  return {
    latitude: c.lat,
    longitude: c.lon,
    timezone: 'GMT',
    utc_offset_seconds: c.utcOffset,
    hourly: {
      time: times,
      temperature_2m: same(c.ta),
      apparent_temperature: same(c.feels),
      precipitation_probability: same(c.precipProb),
      precipitation: same(c.precip),
      snowfall: same(0),
      weather_code: same(c.code),
      wind_speed_10m: same(c.windKmh),
      wind_gusts_10m: same(c.gustKmh),
      uv_index: same(c.uv),
      is_day: same(1),
      visibility: same(20000),
      relative_humidity_2m: same(c.rh),
      cloud_cover: same(c.cloud),
      shortwave_radiation: same(c.rad[0]),
      direct_radiation: same(c.rad[1]),
      diffuse_radiation: same(c.rad[2]),
      direct_normal_irradiance: same(c.rad[3]),
    },
    daily: Object.fromEntries([['time', [c.time.slice(0, 10)]], ...DAILY_VARS.map((k) => [k, [k === 'sunrise' || k === 'sunset' ? null : 0]])]),
  };
}

const LONDON = { lat: 51.51, lon: -0.13, utcOffset: 0 };

const DAYS = {
  // 3 °C, 25 km/h, showers, overcast; 10:00 in late November, sun about 13° up behind cloud.
  london: { ...LONDON, time: '2026-11-26T10:00', ta: 3, feels: -3.7, windKmh: 25, gustKmh: 38, rh: 85, cloud: 100, precipProb: 70, precip: 0.8, code: 80, uv: 0.5, rad: [45, 0, 45, 0] },
  // 15 °C, light wind, clear, midday in late April.
  mild: { ...LONDON, utcOffset: 3600, time: '2026-04-28T13:00', ta: 15, feels: 12.8, windKmh: 8, gustKmh: 14, rh: 60, cloud: 5, precipProb: 0, precip: 0, code: 0, uv: 5, rad: [690, 540, 150, 830] },
  // 28 °C, calm, clear, UV 8, Madrid at solar noon in July.
  madrid: { lat: 40.42, lon: -3.7, utcOffset: 7200, time: '2026-07-15T14:00', ta: 28, feels: 26.8, windKmh: 5, gustKmh: 9, rh: 30, cloud: 0, precipProb: 0, precip: 0, code: 0, uv: 8, rad: [900, 780, 120, 870] },
  // −10 °C, 15 km/h, dry, overcast; Oslo at midday in January, sun barely up.
  oslo: { lat: 59.91, lon: 10.75, utcOffset: 3600, time: '2027-01-15T12:00', ta: -10, feels: -16.2, windKmh: 15, gustKmh: 24, rh: 80, cloud: 100, precipProb: 0, precip: 0, code: 3, uv: 0, rad: [20, 0, 20, 0] },
  // 8 °C, calm and clear at noon on the March equinox.
  sunny8: { ...LONDON, time: '2026-03-20T12:00', ta: 8, feels: 5.9, windKmh: 3, gustKmh: 6, rh: 70, cloud: 0, precipProb: 0, precip: 0, code: 0, uv: 3, rad: [560, 430, 130, 700] },
  // The same 8 °C with 30 km/h wind under full cloud.
  cloudy8: { ...LONDON, time: '2026-03-20T12:00', ta: 8, feels: 0.6, windKmh: 30, gustKmh: 44, rh: 70, cloud: 100, precipProb: 0, precip: 0, code: 3, uv: 1, rad: [120, 0, 120, 0] },
} satisfies Record<string, Conditions>;

type DayId = keyof typeof DAYS;

// Everything in the catalogue, in every thickness, with its usual protection.
const COMPLETE: Inventory = Object.fromEntries(CATALOGUE.map((c) => [c.id, { counts: c.thickness ? { thin: 1, medium: 1, thick: 1 } : { medium: 1 } }]));

function run(id: DayId, engine: Settings['engine'], activity: Activity = 'walking', duration = 0.5): Advice {
  const c: Conditions = DAYS[id];
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(`${c.time}:00Z`) - c.utcOffset * 1000 + 5 * 60_000));
  const f = parseForecast(openMeteo(c) as Parameters<typeof parseForecast>[0], 0);
  const settings: Settings = { ...DEFAULT_SETTINGS, activity, duration, engine };
  // A 30-minute walk unless asked otherwise, no bias, nothing learned.
  const plan = planDay(f, c.time.slice(0, 10), { settings, ratings: [], inventory: COMPLETE, comfort: DEFAULT_COMFORT, garmentWarmth: {}, bias: { mean: 0, count: 0 } });
  expect(plan).not.toBeNull();
  return plan!.advice;
}

const outer = (a: Advice) => a.layers.find((l) => l.kind === 'outer');
const outerProps = (a: Advice) => {
  const o = outer(a);
  return o?.category ? category(o.category).defaults : undefined;
};

/** The band engine's verdicts on these days when the science engine arrived, for comparison. */
const BAND_ENGINE: Record<DayId | 'cycling', Advice['band']> = {
  london: 'bundle',
  mild: 'two',
  madrid: 'tshirt',
  oslo: 'bundle',
  sunny8: 'coat',
  cloudy8: 'bundle',
  cycling: 'bundle',
};

afterEach(() => vi.useRealTimers());

describe('golden days, band engine (recorded)', () => {
  it.each(Object.keys(DAYS) as DayId[])('%s', (id) => {
    const a = run(id, 'bands');
    expect(a.band).toBe(BAND_ENGINE[id]);
    expect(a.science).toBeUndefined();
    expect(a.requirements?.clo).toBeUndefined();
  });

  it('cycling', () => expect(run('london', 'bands', 'cycling').band).toBe(BAND_ENGINE.cycling));

  // Recorded from the Sprint 5 band engine, so choosing bands in Settings keeps exactly those outfits.
  it('gives the Sprint 5 outfits', () => {
    const outfit = (a: Advice) => ({ band: a.band, layers: a.layers.map((l) => [l.kind, l.category, l.thickness].filter(Boolean).join(' ')), extras: a.extras.map((e) => e.id) });
    expect(Object.fromEntries((Object.keys(DAYS) as DayId[]).map((id) => [id, outfit(run(id, 'bands'))]))).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "band": "bundle",
          "extras": [
            "gloves",
            "hat",
          ],
          "layers": [
            "base thermal medium",
            "mid jumper thick",
            "outer coat thick",
            "bottoms heavy-trousers",
            "footwear trainers",
          ],
        },
        "london": {
          "band": "bundle",
          "extras": [
            "umbrella",
            "gloves",
            "hat",
            "scarf",
          ],
          "layers": [
            "base thermal thick",
            "mid jumper thick",
            "outer waterproof-jacket thick",
            "bottoms heavy-trousers",
            "footwear waterproof-shoes",
          ],
        },
        "madrid": {
          "band": "tshirt",
          "extras": [
            "sunglasses",
            "sunscreen",
          ],
          "layers": [
            "base tshirt thin",
            "bottoms shorts",
            "footwear sandals",
          ],
        },
        "mild": {
          "band": "two",
          "extras": [
            "sunglasses",
          ],
          "layers": [
            "base longsleeve medium",
            "mid jumper medium",
            "bottoms jeans",
            "footwear trainers",
          ],
        },
        "oslo": {
          "band": "bundle",
          "extras": [
            "gloves",
            "hat",
            "scarf",
          ],
          "layers": [
            "base thermal thick",
            "mid jumper thick",
            "outer coat thick",
            "bottoms heavy-trousers",
            "footwear trainers",
          ],
        },
        "sunny8": {
          "band": "coat",
          "extras": [
            "sunglasses",
          ],
          "layers": [
            "base longsleeve medium",
            "mid jumper medium",
            "outer coat medium",
            "bottoms jeans",
            "footwear trainers",
          ],
        },
      }
    `);
  });
});

const DEFAULT_PATH: Settings['engine'] = DEFAULT_SETTINGS.engine;

describe('default settings', () => {
  it('have no engine set, so they exercise the fallback', () => expect(DEFAULT_PATH).toBeUndefined());

  it('give the science engine', () => {
    for (const id of Object.keys(DAYS) as DayId[]) expect(run(id, DEFAULT_PATH)).toEqual(run(id, 'science'));
  });
});

describe('golden days, science engine through the default settings', () => {
  it('London, 26 Nov: coat, with a waterproof outer', () => {
    const a = run('london', DEFAULT_PATH);
    expect(a.band).toBe('coat');
    expect(['waterproof', 'hood']).toContain(a.requirements?.rain);
    expect(outerProps(a)?.water).toBe('waterproof');
  });

  it('mild and sunny: two light layers, nothing heavy', () => {
    const a = run('mild', DEFAULT_PATH);
    expect(a.band).toBe('two');
    expect(outer(a)).toBeUndefined();
    expect(a.layers.filter((l) => l.kind === 'base' || l.kind === 'mid').every((l) => l.thickness !== 'thick')).toBe(true);
  });

  it('Madrid, summer: T-shirt, with sunscreen', () => {
    const a = run('madrid', DEFAULT_PATH);
    expect(a.band).toBe('tshirt');
    expect(a.extras.map((e) => e.id)).toContain('sunscreen');
  });

  it('Oslo, January: bundle up, with hat and gloves', () => {
    const a = run('oslo', DEFAULT_PATH);
    expect(a.band).toBe('bundle');
    expect(a.requirements?.accessories).toEqual(expect.arrayContaining(['hat', 'gloves']));
  });

  it('sun against cloud: the clear day is at least one band lighter', () => {
    expect(bandRank(run('sunny8', DEFAULT_PATH).band)).toBeLessThanOrEqual(bandRank(run('cloudy8', DEFAULT_PATH).band) - 1);
  });

  it('cycling: same or warmer than walking, with a windproof outer', () => {
    const walk = run('london', DEFAULT_PATH);
    const ride = run('london', DEFAULT_PATH, 'cycling');
    expect(bandRank(ride.band)).toBeGreaterThanOrEqual(bandRank(walk.band));
    expect(ride.requirements!.clo!.icl).toBeGreaterThanOrEqual(walk.requirements!.clo!.icl);
    expect(ride.requirements?.wind).not.toBe('none');
    expect(outerProps(ride)?.wind).toBe('high');
  });

  it('explains itself in clo and UTCI', () => {
    const a = run('london', DEFAULT_PATH);
    expect(a.science?.exposureMinutes).toBe(30);
    expect(a.science?.target.icl).toBe(a.requirements?.clo?.icl);
    expect(a.science?.utci.utci).toBeLessThan(DAYS.london.ta);
    expect(a.why.rules[0]).toMatch(/^Needs about \d\.\d clo/);
  });
});

// #85 prototype (docs/innovation/sprint-07-feels-in-clothes.md): how long the outfit keeps you warm.
describe('golden days, feels like in what you wear', () => {
  const placeOf = (id: DayId) => ({ lat: DAYS[id].lat, lon: DAYS[id].lon, utcOffsetSeconds: DAYS[id].utcOffset });
  const line = (id: DayId, activity: Activity = 'walking', duration = 0.5) => feelsInClothes(run(id, DEFAULT_PATH, activity, duration), placeOf(id));

  it('an outfit at the clothing target is warm for the whole time outside', () => {
    for (const id of ['london', 'oslo', 'cloudy8'] as const) for (const activity of ['walking', 'cycling'] as const) for (const d of [0.5, 1, 2, 4]) {
      const a = run(id, DEFAULT_PATH, activity, d);
      const t = comfortTime({ hours: a.hours.map((h) => hourToWeather(h, placeOf(id))), metabolic: a.science!.metabolic, worn: a.science!.target.icl, bias: 0 })!;
      expect(t.warm * 60, `${id} ${activity} ${d} h`).toBeGreaterThanOrEqual(a.science!.exposureMinutes - 3);
    }
  });

  it('says nothing on a hot day, and warm all day on mild ones', () => {
    expect(line('madrid')).toBeUndefined();
    expect(line('mild')?.line).toBe('Warm enough in this outfit all day.');
    expect(line('sunny8')?.tone).toBe('covered');
  });

  it('cloudy 8 °C: the coat covers a 30-minute walk', () => {
    expect(line('cloudy8')).toMatchObject({ tone: 'covered', line: 'Warm enough in your coat for about 60 min.', sub: 'You’re out for 30 min.' });
  });

  it('London: the matched layers sum below the target, and the line says so', () => {
    const a = run('london', DEFAULT_PATH);
    expect(a.science!.outfit!.basic).toBeLessThan(a.science!.target.icl);
    expect(line('london')?.tone).toBe('cool');
  });

  it('Oslo for an hour: the heaviest plan is not enough, and the line asks for a layer', () => {
    expect(line('oslo', 'walking', 1)).toMatchObject({ tone: 'cold', sub: expect.stringContaining('Add a layer') });
  });
});
