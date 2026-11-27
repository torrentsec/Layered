// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { apparentTemp, dailyFrom, METNO_DAYS, parseMetno, probFromAmount, sliceAt, symbolToCode, type MetnoStep } from './metno';
import { LONDON } from './metno.fixture';

describe('apparent temperature', () => {
  it('matches the Bureau of Meteorology formula', () => {
    expect(apparentTemp(20, 50, 0)).toBeCloseTo(19.85, 2);
    expect(apparentTemp(30, 70, 2)).toBeCloseTo(34.37, 2);
    expect(apparentTemp(0, 80, 5)).toBeCloseTo(-5.89, 2);
    expect(apparentTemp(-5, 90, 10)).toBeCloseTo(-14.75, 2);
  });
  it('drops with wind and rises with humidity', () => {
    expect(apparentTemp(10, 70, 8)).toBeLessThan(apparentTemp(10, 70, 2));
    expect(apparentTemp(25, 90, 2)).toBeGreaterThan(apparentTemp(25, 40, 2));
  });
});

describe('symbol codes', () => {
  it.each([
    ['clearsky_day', 0],
    ['fair_night', 1],
    ['partlycloudy_polartwilight', 2],
    ['cloudy', 3],
    ['fog', 45],
    ['lightrain', 61],
    ['heavyrain', 65],
    ['rainshowers_day', 81],
    ['lightsnow', 71],
    ['heavysnowshowers_night', 86],
    ['rainandthunder', 95],
    ['heavysleetshowersandthunder_day', 96],
    ['somethingnew', 3],
  ])('%s → %i', (sym, code) => expect(symbolToCode(sym)).toBe(code));
});

describe('precipitation chance from amount', () => {
  it.each([
    [0, 0],
    [0.1, 20],
    [0.2, 40],
    [0.5, 60],
    [1, 80],
  ])('%f mm/h → %i%%', (mm, p) => expect(probFromAmount(mm)).toBe(p));
});

describe('precipitation periods', () => {
  const step: MetnoStep = {
    time: '2026-11-28T18:00:00Z',
    data: {
      instant: { details: { air_temperature: 5 } },
      next_1_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 1.2 } },
      next_6_hours: { summary: { symbol_code: 'lightrain' }, details: { precipitation_amount: 3 } },
    },
  };
  it('uses the 1-hour period for its own hour, then the 6-hour period spread evenly', () => {
    expect(sliceAt(step, 0).mmPerHour).toBe(1.2);
    expect(sliceAt(step, 3).mmPerHour).toBe(0.5);
    expect(sliceAt(step, 3).symbol).toBe('lightrain');
  });
});

describe('parseMetno', () => {
  const OFFSET = 0;
  const f = parseMetno(LONDON, OFFSET, 1_000);

  it('emits one row per hour with no gaps', () => {
    for (let i = 1; i < f.hours.length; i++) {
      expect(Date.parse(`${f.hours[i].time}Z`) - Date.parse(`${f.hours[i - 1].time}Z`)).toBe(3_600_000);
    }
    expect(f.hours[0].time).toBe('2026-11-26T08:00');
  });

  it(`keeps ${METNO_DAYS} days`, () => {
    expect(f.days).toHaveLength(METNO_DAYS);
    expect(f.days[0].date).toBe('2026-11-26');
    expect(f.days.at(-1)!.date).toBe('2026-12-04');
  });

  it('converts units and computes feels-like', () => {
    const h = f.hours[0];
    const src = LONDON.properties.timeseries[0].data.instant.details;
    expect(h.temp).toBeCloseTo(src.air_temperature!, 1);
    expect(h.wind).toBeCloseTo(src.wind_speed! * 3.6, 1);
    expect(h.gusts).toBeCloseTo(src.wind_speed! * 3.6 * 1.5, 1);
    expect(h.feels).toBeCloseTo(apparentTemp(src.air_temperature!, src.relative_humidity!, src.wind_speed!), 1);
    expect(f.source).toBe('met-norway');
    expect(f.fetchedAt).toBe(1_000);
    expect(f.lat).toBe(51.51);
    expect(f.lon).toBe(-0.13);
  });

  it('reads rain, probability and showers from the hourly period', () => {
    const wet = f.hours.find((h) => h.time === '2026-11-26T19:00')!;
    expect(wet.precip).toBe(0.6);
    expect(wet.precipProb).toBe(70);
    expect(wet.code).toBe(80);
    expect(wet.isDay).toBe(false);
    expect(f.hours.find((h) => h.time === '2026-11-26T12:00')!.isDay).toBe(true);
  });

  it('spreads six-hourly rain and marks snow', () => {
    const snowy = f.hours.filter((h) => h.time.startsWith('2026-11-30'));
    expect(snowy).toHaveLength(24);
    for (const h of snowy) {
      expect(h.precip).toBe(0.4);
      expect(h.snow).toBeCloseTo(0.3, 1);
      expect(h.code).toBe(71);
      expect(h.precipProb).toBe(40);
    }
  });

  it('falls back to a 06–18 day when the symbol has no day or night', () => {
    const cloudy = f.hours.filter((h) => h.code === 3);
    expect(cloudy.length).toBeGreaterThan(0);
    for (const h of cloudy) {
      const hr = Number(h.time.slice(11, 13));
      expect(h.isDay).toBe(hr >= 6 && hr < 18);
    }
  });

  it('shifts times to the place clock', () => {
    const sydney = parseMetno(LONDON, 11 * 3600);
    expect(sydney.hours[0].time).toBe('2026-11-26T19:00');
    expect(sydney.utcOffsetSeconds).toBe(39_600);
  });

  it('leaves sunrise and sunset blank', () => {
    expect(f.days.every((d) => d.sunrise === '' && d.sunset === '')).toBe(true);
  });

  it('maps humidity and cloud cover', () => {
    const src = LONDON.properties.timeseries[0].data.instant.details;
    expect(f.hours[0].rh).toBe(src.relative_humidity);
    expect(f.hours[0].cloud).toBe(src.cloud_area_fraction);
    expect(f.hours.every((h) => h.rh !== undefined && h.cloud !== undefined)).toBe(true);
  });

  it('interpolates humidity and cloud across the six-hourly tail', () => {
    const steps = LONDON.properties.timeseries;
    const i = steps.findIndex((s, j) => j > 0 && Date.parse(s.time) - Date.parse(steps[j - 1].time) === 6 * 3_600_000) - 1;
    const [a, b] = [steps[i].data.instant.details, steps[i + 1].data.instant.details];
    const mid = f.hours.find((h) => h.time === new Date(Date.parse(steps[i].time) + 3 * 3_600_000).toISOString().slice(0, 16))!;
    expect(mid.cloud).toBeCloseTo((a.cloud_area_fraction! + b.cloud_area_fraction!) / 2, 1);
    expect(mid.rh).toBeCloseTo((a.relative_humidity! + b.relative_humidity!) / 2, 1);
  });

  it('leaves radiation for the engine to estimate', () => {
    for (const h of f.hours) {
      expect(h.ghi).toBeUndefined();
      expect(h.direct).toBeUndefined();
      expect(h.diffuse).toBeUndefined();
      expect(h.dni).toBeUndefined();
    }
  });

  it('leaves missing humidity and cloud undefined, not 0', () => {
    const bare: MetnoStep = { time: '2026-11-26T08:00:00Z', data: { instant: { details: { air_temperature: 5, wind_speed: 3 } } } };
    const [h] = parseMetno({ properties: { timeseries: [bare] } }, 0).hours;
    expect(h.rh).toBeUndefined();
    expect(h.cloud).toBeUndefined();
    expect('rh' in h).toBe(false);
  });
});

describe('dailyFrom', () => {
  const hour = (time: string, temp: number, code: number, precip: number) => ({
    time, temp, feels: temp - 2, precipProb: precip ? 60 : 0, precip, snow: 0, wind: 10, gusts: temp * 2, uv: 1, isDay: true, code,
  });
  it('takes extremes, sums rain and keeps the worst code', () => {
    const [d] = dailyFrom([hour('2026-11-26T08:00', 4, 2, 0), hour('2026-11-26T09:00', 7, 61, 0.4), hour('2026-11-26T10:00', 5, 3, 0.3)]);
    expect(d).toMatchObject({ date: '2026-11-26', tempMax: 7, tempMin: 4, feelsMax: 5, feelsMin: 2, precipProbMax: 60, precipSum: 0.7, gustMax: 14, code: 61 });
  });
});
