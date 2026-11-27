// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../engine/advise';
import { day, hour } from '../engine/__tests__/fixtures';
import { hourUtci } from '../engine/science/hourly';
import type { Advice } from '../engine/types';
import { londonWhy } from './__fixtures__/science-why';
import { calibratedReading, familiarFeels, familiarRange, windChill, WIND_CHILL_MAX_TA, WIND_CHILL_MIN_WIND } from './feels-calibration';
import { heroReading } from './why-science';

describe('windChill', () => {
  // Environment Canada's published wind chill chart, rounded to whole degrees.
  it.each([
    [5, 10, 3],
    [0, 20, -5],
    [-10, 20, -18],
    [-20, 30, -33],
    [-30, 50, -49],
  ])('%d °C in %d km/h is %d', (ta, v, chart) => {
    expect(Math.round(windChill(ta, v)!)).toBe(chart);
  });

  it('only applies where the formula was fitted', () => {
    expect(windChill(WIND_CHILL_MAX_TA, 20)).not.toBeNull();
    expect(windChill(WIND_CHILL_MAX_TA + 0.1, 20)).toBeNull();
    expect(windChill(0, WIND_CHILL_MIN_WIND)).not.toBeNull();
    expect(windChill(0, WIND_CHILL_MIN_WIND - 0.1)).toBeNull();
    expect(windChill(NaN, 20)).toBeNull();
  });
});

describe('familiarFeels', () => {
  it('uses wind chill when cold and windy, apparent temperature otherwise', () => {
    expect(familiarFeels(hour('2026-11-26T08:00', { temp: 5, wind: 25, feels: 0 }))).toBeCloseTo(windChill(5, 25)!, 6);
    expect(familiarFeels(hour('2026-07-15T14:00', { temp: 28, wind: 5, feels: 26.8 }))).toBe(26.8);
    expect(familiarFeels(hour('2026-11-26T08:00', { temp: 3, wind: 2, feels: 1.5 }))).toBe(1.5);
  });

  it('gives the range across the window', () => {
    const hs = day(3, (i) => ({ temp: 2 + i, wind: 20, feels: 0 }));
    expect(familiarRange(hs)).toEqual({ min: windChill(2, 20), max: windChill(4, 20) });
    expect(familiarRange([])).toBeNull();
  });
});

// The PO's case from the Sprint 6 Review and the six golden days, as the
// write-up's evidence table: what each number would say at the same hour.
describe('evidence: UTCI against the numbers other apps show', () => {
  const LONDON = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
  const cases = {
    review: { time: '2026-11-26T08:00', temp: 5, feels: -0.6, wind: 25, rh: 85, cloud: 100, ghi: 10, direct: 0, diffuse: 10, dni: 0 },
    london: { time: '2026-11-26T10:00', temp: 3, feels: -3.7, wind: 25, rh: 85, cloud: 100, ghi: 45, direct: 0, diffuse: 45, dni: 0 },
    mild: { time: '2026-04-28T12:00', temp: 15, feels: 12.8, wind: 8, rh: 60, cloud: 5, ghi: 690, direct: 540, diffuse: 150, dni: 830 },
    oslo: { time: '2027-01-15T11:00', temp: -10, feels: -16.2, wind: 15, rh: 80, cloud: 100, ghi: 20, direct: 0, diffuse: 20, dni: 0, place: { lat: 59.91, lon: 10.75, utcOffsetSeconds: 0 } },
    sunny8: { time: '2026-03-20T12:00', temp: 8, feels: 5.9, wind: 3, rh: 70, cloud: 0, ghi: 560, direct: 430, diffuse: 130, dni: 700 },
    cloudy8: { time: '2026-03-20T12:00', temp: 8, feels: 0.6, wind: 30, rh: 70, cloud: 100, ghi: 120, direct: 0, diffuse: 120, dni: 0 },
  };
  const round = (n: number | null) => (n === null ? null : Math.round(n));

  it('records the gap', () => {
    const table = Object.fromEntries(
      Object.entries(cases).map(([id, { place, ...h }]: [string, { place?: typeof LONDON } & Record<string, unknown>]) => {
        const hr = hour(h.time as string, h);
        return [id, { actual: hr.temp, utci: round(hourUtci(hr, place ?? LONDON).utci), windChill: round(windChill(hr.temp, hr.wind)), apparent: round(hr.feels) }];
      }),
    );
    expect(table).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "actual": 8,
          "apparent": 1,
          "utci": -6,
          "windChill": 4,
        },
        "london": {
          "actual": 3,
          "apparent": -4,
          "utci": -13,
          "windChill": -2,
        },
        "mild": {
          "actual": 15,
          "apparent": 13,
          "utci": 22,
          "windChill": null,
        },
        "oslo": {
          "actual": -10,
          "apparent": -16,
          "utci": -24,
          "windChill": -17,
        },
        "review": {
          "actual": 5,
          "apparent": -1,
          "utci": -11,
          "windChill": 1,
        },
        "sunny8": {
          "actual": 8,
          "apparent": 6,
          "utci": 19,
          "windChill": null,
        },
      }
    `);
  });
});

describe('calibratedReading', () => {
  const at = (over: Parameters<typeof londonWhy>[0] = {}, h = { temp: 3, wind: 25, feels: -3.7 }) =>
    ({ effective: 2.7, science: londonWhy(over), hours: [hour('2026-11-26T08:00', h)] }) as unknown as Advice;

  it('keeps today’s hero for utci', () => {
    const a = at();
    expect(calibratedReading(a, 'utci', 'c')).toEqual({ ...heroReading(a, 'c'), note: '' });
  });

  it('headlines wind chill with the UTCI stress words', () => {
    const r = calibratedReading(at(), 'familiar', 'c');
    expect(r).toMatchObject({ text: `${Math.round(windChill(3, 25)!)}°`, label: 'Feels like', note: 'Moderate cold stress' });
    expect(r.value).toBeCloseTo(windChill(3, 25)!, 6);
  });

  it('puts the real temperature first and names the wind', () => {
    expect(calibratedReading(at(), 'actual', 'c')).toEqual({ value: 3, text: '3°', label: 'Actual', note: 'Feels -3° in the wind' });
    expect(calibratedReading(at(), 'actual', 'f')).toMatchObject({ text: '37°', note: 'Feels 26° in the wind' });
  });

  it('names the sun when it makes it feel warmer, and nothing when there is no clear cause', () => {
    const sunny = { utci: { utci: 12, category: 'none' as const, clamped: false, outOfRange: false }, ta: 8, tmrtDelta: 15 };
    expect(calibratedReading(at(sunny, { temp: 8, wind: 3, feels: 5.9 }), 'actual', 'c').note).toBe('Feels 12° in the sun');
    expect(calibratedReading(at({}, { temp: 3, wind: 5, feels: 1 }), 'actual', 'c').note).toBe('Feels -3°');
    const same = { utci: { utci: 3.2, category: 'slight-cold' as const, clamped: false, outOfRange: false } };
    expect(calibratedReading(at(same), 'actual', 'c').note).toBe('');
  });

  it('never invents a number when UTCI has none, or without the science engine', () => {
    const hot = at({ utci: { utci: NaN, category: 'extreme-heat', clamped: false, outOfRange: true } });
    for (const v of ['familiar', 'actual'] as const) {
      expect(calibratedReading(hot, v, 'c')).toEqual({ ...heroReading(hot, 'c'), note: '' });
    }
    const bands = advise({ hours: day(3, () => ({ temp: 3, wind: 25, feels: -1 })), activity: 'walking' })!;
    expect(calibratedReading(bands, 'familiar', 'c')).toMatchObject({ label: 'Dress for', note: '' });
  });

  it('only changes the words: the advice it is given is untouched', () => {
    const a = at();
    const before = JSON.stringify(a);
    calibratedReading(a, 'familiar', 'c');
    calibratedReading(a, 'actual', 'c');
    expect(JSON.stringify(a)).toBe(before);
  });
});
