// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { Hour } from '../../types';
import { meanRadiantTemp, meanRadiantTempParts, sunPosition } from '../radiation';
import { beamFraction, SITE_IDS, SITES, siteOf, STREET_ASPECT, STREET_WIND_FACTOR } from '../site';
import { hourToWeather } from '../weather';

const LONDON = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
const NOON_EQUINOX = sunPosition(51.51, -0.13, Date.parse('2026-03-20T12:00:00Z'));
const NIGHT = { elevation: -20, dayOfYear: 330 };
const CLEAR = { ghi: 560, direct: 430, diffuse: 130, dni: 700 };
const DARK = { ghi: 0, direct: 0, diffuse: 0 };

const hour = (over: Partial<Hour> = {}): Hour => ({
  time: '2026-03-20T12:00', temp: 8, feels: 6, precipProb: 0, precip: 0, snow: 0, wind: 18, gusts: 25,
  uv: 3, isDay: true, code: 0, rh: 70, cloud: 0, ...CLEAR, ...over,
});

describe('site geometry', () => {
  it('has three sites and an H/W = 1 street with a sky view of cos(atan 2)', () => {
    expect(SITE_IDS).toEqual(['open', 'street', 'shade']);
    expect(STREET_ASPECT).toBe(1);
    expect(SITES.street.skyView).toBeCloseTo(1 / Math.sqrt(5), 12);
    expect(SITES.open).toEqual({ skyView: 1, windFactor: 1 });
    expect(SITES.shade).toEqual({ skyView: 1, windFactor: 1 });
    expect(SITES.street.windFactor).toBe(STREET_WIND_FACTOR);
    expect(STREET_WIND_FACTOR).toBe(0.6);
  });

  it('reads anything unknown, including a missing value, as open', () => {
    expect(siteOf(undefined)).toBe('open');
    expect(siteOf('canyon')).toBe('open');
    expect(siteOf(3)).toBe('open');
    expect(siteOf('street')).toBe('street');
    expect(siteOf('shade')).toBe('shade');
  });
});

describe('beamFraction', () => {
  it('lets the whole beam through in the open and none of it in shade', () => {
    expect(beamFraction('open', 30)).toBe(1);
    expect(beamFraction('shade', 30)).toBe(0);
    expect(beamFraction('shade', 80)).toBe(0);
  });

  it('averages the street over orientations: (2/π)·asin(tan β / 2)', () => {
    expect(beamFraction('street', 13)).toBeCloseTo((2 / Math.PI) * Math.asin(Math.tan((13 * Math.PI) / 180) / 2), 12);
    expect(beamFraction('street', 13)).toBeLessThan(0.08);
    expect(beamFraction('street', 45)).toBeCloseTo(1 / 3, 12);
    // Above atan(2) the sun reaches the centre line whatever the street's direction.
    expect(beamFraction('street', 63.5)).toBe(1);
    expect(beamFraction('street', 90)).toBe(1);
  });

  it('gives no beam with the sun down or an unusable elevation', () => {
    expect(beamFraction('street', 0)).toBe(0);
    expect(beamFraction('street', -5)).toBe(0);
    expect(beamFraction('street', Number.NaN)).toBe(0);
  });
});

describe('mean radiant temperature by site', () => {
  it('is unchanged for the open site, given or not', () => {
    for (const [sun, rad, cloud] of [[NOON_EQUINOX, CLEAR, 0], [NOON_EQUINOX, { ghi: 120, direct: 0, diffuse: 120 }, 1], [NIGHT, DARK, 0]] as const) {
      expect(meanRadiantTemp(8, 70, cloud, sun, rad, 'open')).toBe(meanRadiantTemp(8, 70, cloud, sun, rad));
      expect(meanRadiantTempParts(8, 70, cloud, sun, rad, 'open')).toEqual(meanRadiantTempParts(8, 70, cloud, sun, rad));
    }
  });

  it('shade removes only the beam', () => {
    const shade = meanRadiantTemp(8, 70, 0, NOON_EQUINOX, CLEAR, 'shade');
    expect(shade).toBeCloseTo(meanRadiantTemp(8, 70, 0, NOON_EQUINOX, { ...CLEAR, direct: 0, dni: 0 }), 9);
    expect(shade).toBeLessThan(meanRadiantTemp(8, 70, 0, NOON_EQUINOX, CLEAR) - 10);
    expect(meanRadiantTemp(2, 80, 0, NIGHT, DARK, 'shade')).toBe(meanRadiantTemp(2, 80, 0, NIGHT, DARK));
  });

  it('a street is warmer than the open at a clear night: walls hide the cold sky', () => {
    const open = meanRadiantTempParts(2, 80, 0, NIGHT, DARK).tmrt;
    const street = meanRadiantTempParts(2, 80, 0, NIGHT, DARK, 'street').tmrt;
    expect(street).toBeGreaterThan(open + 5);
    expect(street).toBeLessThan(2);
  });

  it('a street is cooler than the open in low clear sun', () => {
    expect(meanRadiantTemp(8, 70, 0, NOON_EQUINOX, CLEAR, 'street')).toBeLessThan(meanRadiantTemp(8, 70, 0, NOON_EQUINOX, CLEAR));
  });
});

describe('hourToWeather with a site', () => {
  it('is the open site when the place carries none', () => {
    expect(hourToWeather(hour(), LONDON)).toEqual(hourToWeather(hour(), { ...LONDON, site: 'open' }));
  });

  it('shelters the 10 m wind in a street only', () => {
    expect(hourToWeather(hour(), { ...LONDON, site: 'street' }).wind10).toBeCloseTo((18 / 3.6) * STREET_WIND_FACTOR, 9);
    expect(hourToWeather(hour(), { ...LONDON, site: 'shade' }).wind10).toBeCloseTo(18 / 3.6, 9);
  });

  it('passes the site to the radiation, forecast or estimated', () => {
    const open = hourToWeather(hour(), LONDON);
    expect(hourToWeather(hour(), { ...LONDON, site: 'shade' }).tmrt).toBeLessThan(open.tmrt - 10);
    const metno = hour({ ghi: undefined, direct: undefined, diffuse: undefined, dni: undefined });
    const est = hourToWeather(metno, LONDON);
    expect(est.radiation).toBe('estimated');
    expect(hourToWeather(metno, { ...LONDON, site: 'shade' }).tmrt).toBeLessThan(est.tmrt - 10);
  });
});
