// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { parseForecast } from '../../../data/forecast-types';
import { parseMetno } from '../../../data/metno';
import { LONDON } from '../../../data/metno.fixture';
import { OPEN_METEO_LONDON, OPEN_METEO_LONDON_LEGACY } from '../../../data/openmeteo.fixture';
import type { Hour } from '../../types';
import { estimateRadiation, meanRadiantTemp, splitGhi, sunForHourMean, sunPosition } from '../radiation';
import { cloudFromCode, DEFAULT_RH, hourToWeather } from '../weather';

const LONDON_PLACE = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };

const hour = (over: Partial<Hour> = {}): Hour => ({
  time: '2026-11-26T12:00',
  temp: 8,
  feels: 6,
  precipProb: 0,
  precip: 0,
  snow: 0,
  wind: 0,
  gusts: 0,
  uv: 1,
  isDay: true,
  code: 3,
  ...over,
});

const NOON_UTC = Date.parse('2026-11-26T12:00:00Z');

describe('hourToWeather: units', () => {
  it('turns km/h into m/s at 10 m and keeps air temperature', () => {
    const w = hourToWeather(hour({ wind: 25, temp: 3 }), LONDON_PLACE);
    expect(w.wind10).toBeCloseTo(25 / 3.6, 9);
    expect(w.ta).toBe(3);
  });

  it('reads humidity when present and assumes 70% when not', () => {
    expect(hourToWeather(hour({ rh: 92 }), LONDON_PLACE).rh).toBe(92);
    expect(hourToWeather(hour(), LONDON_PLACE).rh).toBe(DEFAULT_RH);
    expect(DEFAULT_RH).toBe(70);
  });

  it('never gives a negative or missing wind', () => {
    expect(hourToWeather(hour({ wind: -3 }), LONDON_PLACE).wind10).toBe(0);
    expect(hourToWeather(hour({ wind: Number.NaN }), LONDON_PLACE).wind10).toBe(0);
  });
});

describe('hourToWeather: forecast radiation (Open-Meteo)', () => {
  const rad = { ghi: 300, direct: 200, diffuse: 100, dni: 450 };

  it('uses the forecast values with the sun at the middle of the preceding hour', () => {
    const w = hourToWeather(hour({ ...rad, cloud: 20, rh: 60 }), LONDON_PLACE);
    const sun = sunForHourMean(51.51, -0.13, NOON_UTC);
    expect(w.radiation).toBe('forecast');
    expect(w.tmrt).toBeCloseTo(meanRadiantTemp(8, 60, 0.2, sun, rad), 9);
    expect(w.tmrt).toBeGreaterThan(w.ta + 5);
  });

  it('splits a global value that comes without direct and diffuse', () => {
    const w = hourToWeather(hour({ ghi: 300, cloud: 20 }), LONDON_PLACE);
    const sun = sunForHourMean(51.51, -0.13, NOON_UTC);
    expect(w.radiation).toBe('forecast');
    expect(w.tmrt).toBeCloseTo(meanRadiantTemp(8, DEFAULT_RH, 0.2, sun, { ghi: 300, ...splitGhi(sun, 300) }), 9);
  });

  it('converts local wall time to UTC with the forecast offset', () => {
    const paris = { lat: 48.85, lon: 2.35, utcOffsetSeconds: 3600 };
    const w = hourToWeather(hour({ ...rad, cloud: 20, rh: 60 }), paris);
    const sun = sunForHourMean(48.85, 2.35, NOON_UTC - 3_600_000);
    expect(w.tmrt).toBeCloseTo(meanRadiantTemp(8, 60, 0.2, sun, rad), 9);
  });
});

describe('hourToWeather: estimated radiation', () => {
  it('estimates from cloud cover when the provider has no radiation (MET Norway)', () => {
    const w = hourToWeather(hour({ cloud: 40, rh: 80 }), LONDON_PLACE);
    const sun = sunPosition(51.51, -0.13, NOON_UTC);
    expect(w.radiation).toBe('estimated');
    expect(w.tmrt).toBeCloseTo(meanRadiantTemp(8, 80, 0.4, sun, estimateRadiation(sun, 0.4)), 9);
  });

  it('reads cloud from the weather code on hours saved without cloud cover', () => {
    const sun = sunPosition(51.51, -0.13, NOON_UTC);
    for (const code of [0, 2, 3, 61]) {
      const w = hourToWeather(hour({ code }), LONDON_PLACE);
      const c = cloudFromCode(code);
      expect(w.radiation).toBe('estimated');
      expect(w.tmrt, `code ${code}`).toBeCloseTo(meanRadiantTemp(8, DEFAULT_RH, c, sun, estimateRadiation(sun, c)), 9);
    }
  });

  it('maps WMO codes to cloud fractions', () => {
    expect([0, 1, 2, 3].map(cloudFromCode)).toEqual([0, 0.25, 0.5, 1]);
    for (const c of [80, 81, 82, 85, 86]) expect(cloudFromCode(c), String(c)).toBe(0.75);
    for (const c of [45, 48, 51, 61, 63, 65, 71, 73, 75, 95, 99]) expect(cloudFromCode(c), String(c)).toBe(1);
  });

  it('makes a clear noon warmer and a clear night colder than overcast', () => {
    const noon = (code: number) => hourToWeather(hour({ code }), LONDON_PLACE).tmrt;
    const night = (code: number) => hourToWeather(hour({ code, time: '2026-11-26T23:00', isDay: false }), LONDON_PLACE).tmrt;
    expect(noon(0)).toBeGreaterThan(noon(3));
    expect(night(0)).toBeLessThan(night(3));
  });
});

describe('hourToWeather: no place', () => {
  it('leaves Tmrt at air temperature without coordinates', () => {
    for (const place of [{ lat: Number.NaN, lon: 0, utcOffsetSeconds: 0 }, { lat: 51.51, lon: Number.NaN, utcOffsetSeconds: 0 }]) {
      expect(hourToWeather(hour({ ghi: 300, cloud: 0 }), place)).toEqual({ ta: 8, rh: DEFAULT_RH, wind10: 0, tmrt: 8, radiation: 'none' });
    }
  });

  it('leaves Tmrt at air temperature for an unreadable time', () => {
    expect(hourToWeather(hour({ time: 'not a time' }), LONDON_PLACE).radiation).toBe('none');
  });
});

describe('golden day: sun against cloud', () => {
  it('gives the calm clear noon a much higher Tmrt than the windy overcast one', () => {
    const clear = hourToWeather(hour({ temp: 8, wind: 0, code: 0, cloud: 0 }), LONDON_PLACE);
    const grey = hourToWeather(hour({ temp: 8, wind: 30, code: 3, cloud: 100 }), LONDON_PLACE);
    expect(clear.tmrt - grey.tmrt).toBeGreaterThan(5);
    expect(grey.wind10).toBeCloseTo(30 / 3.6, 9);
  });
});

describe('every provider and vintage of forecast', () => {
  const sources = {
    'Open-Meteo': parseForecast(OPEN_METEO_LONDON, 0),
    'Open-Meteo saved before Sprint 4': parseForecast(OPEN_METEO_LONDON_LEGACY, 0),
    'MET Norway': parseMetno(LONDON, 0, 0),
  };

  it.each(Object.entries(sources))('%s: every hour becomes finite Weather', (_, f) => {
    expect(f.hours.length).toBeGreaterThan(0);
    for (const h of f.hours) {
      const w = hourToWeather(h, f);
      for (const k of ['ta', 'rh', 'wind10', 'tmrt'] as const) expect(Number.isFinite(w[k]), `${h.time} ${k}`).toBe(true);
      expect(w.radiation).not.toBe('none');
      expect(Math.abs(w.tmrt - w.ta), h.time).toBeLessThan(40);
    }
  });

  it('labels forecast and estimated radiation by provider', () => {
    const labels = (f: (typeof sources)[keyof typeof sources]) => new Set(f.hours.map((h) => hourToWeather(h, f).radiation));
    expect(labels(sources['Open-Meteo']).has('forecast')).toBe(true);
    expect([...labels(sources['Open-Meteo saved before Sprint 4'])]).toEqual(['estimated']);
    expect([...labels(sources['MET Norway'])]).toEqual(['estimated']);
  });

  it('survives a JSON round trip, as saved forecasts do', () => {
    const f = sources['Open-Meteo'];
    const saved = JSON.parse(JSON.stringify(f)) as typeof f;
    expect(saved.hours.map((h) => hourToWeather(h, saved))).toEqual(f.hours.map((h) => hourToWeather(h, f)));
  });
});
