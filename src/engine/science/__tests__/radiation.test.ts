// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import mrt from '../__fixtures__/mrt.json';
import {
  estimateRadiation,
  HOUR_MEAN_OFFSET_MS,
  meanRadiantTemp,
  meanRadiantTempParts,
  MIN_SUN_ELEVATION,
  NIGHT_CAP_K,
  sunForHourMean,
  sunPosition,
  windAtBody,
} from '../radiation';
import type { Radiation, SunPosition } from '../types';

const tol = mrt.meta.tolerance;
const MIDSUMMER = 172;

const within = (actual: number, expected: number, t: number, row: unknown) => {
  if (Math.abs(actual - expected) > t) {
    throw new Error(`${actual} vs ${expected} (±${t}) for ${JSON.stringify(row)}`);
  }
};

const sun = (elevation: number, dayOfYear = MIDSUMMER): SunPosition => ({ elevation, dayOfYear });
const rad = (direct: number, diffuse: number): Radiation => ({ ghi: direct + diffuse, direct, diffuse });

describe('sunPosition against mrt.json → solarPosition', () => {
  it.each(mrt.solarPosition)('$place $utc', (row) => {
    const s = sunPosition(row.lat, row.lon, Date.parse(row.utc));
    within(s.elevation, row.elevation, tol.elevation, row);
  });

  it('gives the UTC day of year', () => {
    expect(sunPosition(51.5, 0, Date.parse('2026-01-01T00:00:00Z')).dayOfYear).toBe(1);
    expect(sunPosition(51.5, 0, Date.parse('2026-06-21T23:59:00Z')).dayOfYear).toBe(172);
    expect(sunPosition(51.5, 0, Date.parse('2026-12-31T12:00:00Z')).dayOfYear).toBe(365);
  });

  it('takes the sun half an hour before an hourly row', () => {
    const t = Date.parse('2026-11-26T09:00:00Z');
    expect(sunForHourMean(51.51, -0.13, t)).toEqual(sunPosition(51.51, -0.13, t - HOUR_MEAN_OFFSET_MS));
    expect(sunForHourMean(51.51, -0.13, t).elevation).toBeLessThan(sunPosition(51.51, -0.13, t).elevation);
  });
});

describe('meanRadiantTempParts against mrt.json → forecast (before the night cap)', () => {
  it.each(mrt.forecast)('ta $in.ta, elevation $in.elevation, cloud $in.cloud', (row) => {
    const { ta, rh, cloud, elevation, direct, diffuse } = row.in;
    const p = meanRadiantTempParts(ta, rh, cloud, sun(elevation), rad(direct, diffuse));
    within(p.tmrt, row.out.tmrt, tol.tmrt, row);
    within(p.lwDown, row.out.lwDown, tol.radiation, row);
    within(p.lwUp, row.out.lwUp, tol.radiation, row);
    within(p.beamNormal, row.out.beamNormal, tol.radiation, row);
    within(p.fp, row.out.fp, 0.005, row);
  });
});

describe('estimateRadiation and Tmrt against mrt.json → cloudFallback', () => {
  it.each(mrt.cloudFallback)('ta $in.ta, elevation $in.elevation, cloud $in.cloud', (row) => {
    const { ta, rh, cloud, elevation, dayOfYear } = row.in;
    const s = sun(elevation, dayOfYear);
    const r = estimateRadiation(s, cloud);
    within(r.ghi, row.out.ghi, tol.radiation, row);
    within(r.direct, row.out.direct, tol.radiation, row);
    within(r.diffuse, row.out.diffuse, tol.radiation, row);
    within(meanRadiantTempParts(ta, rh, cloud, s, r).tmrt, row.out.tmrt, tol.tmrt, row);
  });

  it('is zero with the sun below the horizon', () => {
    expect(estimateRadiation(sun(-0.1), 0)).toEqual({ ghi: 0, direct: 0, diffuse: 0 });
    expect(estimateRadiation(sun(0), 0)).toEqual({ ghi: 0, direct: 0, diffuse: 0 });
  });

  it('treats a missing cloud value as overcast and clamps out-of-range ones', () => {
    expect(estimateRadiation(sun(40), Number.NaN)).toEqual(estimateRadiation(sun(40), 1));
    expect(estimateRadiation(sun(40), 1.5)).toEqual(estimateRadiation(sun(40), 1));
    expect(estimateRadiation(sun(40), -0.2)).toEqual(estimateRadiation(sun(40), 0));
  });

  it('never gains radiation as cloud thickens', () => {
    for (const e of [2, 10, 30, 60]) {
      let prev = Infinity;
      for (let c = 0; c <= 1.0001; c += 0.05) {
        const { ghi, direct, diffuse } = estimateRadiation(sun(e), c);
        expect(ghi).toBeLessThanOrEqual(prev + 1e-9);
        expect(direct + diffuse).toBeCloseTo(ghi, 9);
        prev = ghi;
      }
    }
  });
});

describe('meanRadiantTemp night and low sun', () => {
  const night = sun(-10);

  it('caps night cooling at NIGHT_CAP_K below air temperature', () => {
    const raw = meanRadiantTempParts(-5, 80, 0, night, rad(0, 0)).tmrt;
    expect(-5 - raw).toBeGreaterThan(NIGHT_CAP_K);
    expect(meanRadiantTemp(-5, 80, 0, night, rad(0, 0))).toBe(-5 - NIGHT_CAP_K);
  });

  it('leaves night rows under the cap unchanged', () => {
    const raw = meanRadiantTempParts(15, 60, 0, night, rad(0, 0)).tmrt;
    expect(15 - raw).toBeLessThan(NIGHT_CAP_K);
    expect(meanRadiantTemp(15, 60, 0, night, rad(0, 0))).toBe(raw);
  });

  it('never applies the cap with the sun up', () => {
    const s = sun(MIN_SUN_ELEVATION);
    expect(meanRadiantTemp(-5, 80, 0, s, rad(0, 0))).toBe(meanRadiantTempParts(-5, 80, 0, s, rad(0, 0)).tmrt);
  });

  it('ignores the beam below MIN_SUN_ELEVATION but keeps diffuse light', () => {
    const low = meanRadiantTempParts(5, 85, 0.3, sun(0.5), rad(5, 20));
    expect(low.beamNormal).toBe(0);
    expect(low.fp).toBe(0);
    expect(low.tmrt).toBeGreaterThan(meanRadiantTempParts(5, 85, 0.3, sun(0.5), rad(0, 0)).tmrt);
  });

  it('prefers the provider direct normal irradiance over direct / sin β', () => {
    const r = { ...rad(400, 100), dni: 700 };
    expect(meanRadiantTempParts(15, 60, 0.1, sun(30), r).beamNormal).toBe(700);
  });

  it('treats negative or non-finite radiation as zero', () => {
    const bad: Radiation = { ghi: -3, direct: Number.NaN, diffuse: -1 };
    expect(meanRadiantTempParts(10, 70, 0.5, sun(20), bad).tmrt).toBe(
      meanRadiantTempParts(10, 70, 0.5, sun(20), rad(0, 0)).tmrt,
    );
  });
});

describe('meanRadiantTemp properties', () => {
  const tas = [-20, -5, 0, 10, 20, 32];

  it('tends to air temperature with no sun and full cloud', () => {
    for (const ta of tas) {
      for (const rh of [30, 60, 95]) {
        const overcast = meanRadiantTemp(ta, rh, 1, sun(-20), rad(0, 0));
        const clear = meanRadiantTemp(ta, rh, 0, sun(-20), rad(0, 0));
        // The ground is taken at εp = 0.97, so overcast sits just below ta.
        expect(Math.abs(overcast - ta)).toBeLessThan(1.5);
        expect(overcast).toBeLessThanOrEqual(ta);
        expect(clear).toBeLessThan(overcast);
      }
    }
  });

  it('rises monotonically with global irradiance', () => {
    for (const ta of tas) {
      for (const e of [5, 20, 45, 70]) {
        for (const shape of [rad(0.8, 0.2), rad(0.2, 0.8), rad(0, 1)]) {
          let prev = -Infinity;
          for (let g = 0; g <= 1000; g += 50) {
            const r: Radiation = { ghi: g, direct: shape.direct * g, diffuse: shape.diffuse * g };
            const t = meanRadiantTemp(ta, 60, 0.3, sun(e), r);
            expect(t).toBeGreaterThan(prev);
            prev = t;
          }
        }
      }
    }
  });
});

describe('windAtBody', () => {
  it('scales 10 m wind by the log profile factor of about 0.68', () => {
    expect(windAtBody(1)).toBeCloseTo(0.68, 2);
    expect(windAtBody(10)).toBeCloseTo(6.805, 3);
    expect(windAtBody(0)).toBe(0);
  });

  it('never returns a negative speed', () => {
    expect(windAtBody(-2)).toBe(0);
    expect(windAtBody(Number.NaN)).toBe(0);
  });
});
