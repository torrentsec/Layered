// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../engine/advise';
import { day, hour } from '../engine/__tests__/fixtures';
import { hourUtci } from '../engine/science/hourly';
import type { Advice } from '../engine/types';
import { londonWhy } from './__fixtures__/science-why';
import { calibratedReading } from './feels-calibration';
import { heroReading } from './why-science';

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
        return [id, { actual: hr.temp, utci: round(hourUtci(hr, place ?? LONDON).utci), apparent: round(hr.feels) }];
      }),
    );
    expect(table).toMatchInlineSnapshot(`
      {
        "cloudy8": {
          "actual": 8,
          "apparent": 1,
          "utci": -6,
        },
        "london": {
          "actual": 3,
          "apparent": -4,
          "utci": -13,
        },
        "mild": {
          "actual": 15,
          "apparent": 13,
          "utci": 22,
        },
        "oslo": {
          "actual": -10,
          "apparent": -16,
          "utci": -24,
        },
        "review": {
          "actual": 5,
          "apparent": -1,
          "utci": -11,
        },
        "sunny8": {
          "actual": 8,
          "apparent": 6,
          "utci": 19,
        },
      }
    `);
  });
});

describe('calibratedReading', () => {
  const at = (over: Parameters<typeof londonWhy>[0] = {}, h = { temp: 3, wind: 25, feels: -3.7 }) =>
    ({ effective: 2.7, science: londonWhy(over), hours: [hour('2026-11-26T08:00', h)] }) as unknown as Advice;

  it('puts the real temperature first and names the wind', () => {
    expect(calibratedReading(at(), 'c')).toEqual({ feelsFirst: true, value: londonWhy().utci.utci, text: '3°', label: 'Actual', note: 'Feels -3° in the wind' });
    expect(calibratedReading(at(), 'f')).toMatchObject({ text: '37°', note: 'Feels 26° in the wind' });
  });

  it('names the sun when it makes it feel warmer, and nothing when there is no clear cause', () => {
    const sunny = { utci: { utci: 12, category: 'none' as const, clamped: false, outOfRange: false }, ta: 8, tmrtDelta: 15 };
    expect(calibratedReading(at(sunny, { temp: 8, wind: 3, feels: 5.9 }), 'c').note).toBe('Feels 12° in the sun');
    expect(calibratedReading(at({}, { temp: 3, wind: 5, feels: 1 }), 'c').note).toBe('Feels -3°');
    const same = { utci: { utci: 3.2, category: 'slight-cold' as const, clamped: false, outOfRange: false } };
    expect(calibratedReading(at(same), 'c').note).toBe('');
  });

  it('never invents a number when UTCI has none, or without the science engine', () => {
    const hot = at({ utci: { utci: NaN, category: 'extreme-heat', clamped: false, outOfRange: true } });
    expect(calibratedReading(hot, 'c')).toEqual({ ...heroReading(hot, 'c'), note: '', feelsFirst: false });
    const bands = advise({ hours: day(3, () => ({ temp: 3, wind: 25, feels: -1 })), activity: 'walking' })!;
    expect(calibratedReading(bands, 'c')).toMatchObject({ label: 'Dress for', note: '', feelsFirst: false });
  });

  it('only changes the words: the advice it is given is untouched', () => {
    const a = at();
    const before = JSON.stringify(a);
    calibratedReading(a, 'c');
    expect(JSON.stringify(a)).toBe(before);
  });
});
