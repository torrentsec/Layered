// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import clothing from '../__fixtures__/clothing.json';
import { bandRank } from '../../bands';
import type { Activity, BandId } from '../../types';
import { estimateRadiation, meanRadiantTemp, sunPosition } from '../radiation';
import {
  BAND_PLAN_CLO,
  CLO_BAND_EDGES,
  CLO_EDGE_HEDGE,
  CLO_EDGE_HEDGE_WIDE,
  bandForClo,
  clothingTarget,
  nearCloEdge,
  targetHour,
} from '../target';
import type { Weather } from '../types';

const LONDON = { lat: 51.51, lon: -0.13 };
const MADRID = { lat: 40.42, lon: -3.7 };
const OSLO = { lat: 59.91, lon: 10.75 };

/** Weather for one UTC hour with radiation estimated from cloud (0..1). */
function wx(place: { lat: number; lon: number }, iso: string, ta: number, windKmh: number, rh: number, cloud: number): Weather {
  const sun = sunPosition(place.lat, place.lon, Date.parse(iso));
  const tmrt = meanRadiantTemp(ta, rh, cloud, sun, estimateRadiation(sun, cloud));
  return { ta, rh, wind10: windKmh / 3.6, tmrt, radiation: 'estimated' };
}

const walk = (hours: Weather[], activity: Activity = 'walking') =>
  clothingTarget({ hours, activity, exposureHours: 0.5, bias: 0 });

const hoursOf = (day: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${day}T${String(from + i).padStart(2, '0')}:00:00Z`);

describe('bandForClo', () => {
  it('uses the §9.1 edges, lower edge inclusive', () => {
    const cases: [number, BandId][] = [
      [0, 'tshirt'], [0.49, 'tshirt'], [0.5, 'light'], [0.69, 'light'], [0.7, 'two'], [0.94, 'two'],
      [0.95, 'jacket'], [1.24, 'jacket'], [1.25, 'coat'], [1.49, 'coat'], [1.5, 'bundle'], [3, 'bundle'],
    ];
    for (const [icl, band] of cases) expect(bandForClo(icl), `${icl}`).toBe(band);
  });

  it('puts each band plan in its own band, and the plans match the fixture', () => {
    for (const plan of clothing.bandPlans) {
      const band = plan.band as BandId;
      expect(BAND_PLAN_CLO[band]).toBeCloseTo(plan.icl, 2);
      expect(bandForClo(BAND_PLAN_CLO[band])).toBe(band);
    }
  });

  it('puts every edge midway between neighbouring plans, to 0.05', () => {
    const order: BandId[] = ['tshirt', 'light', 'two', 'jacket', 'coat', 'bundle'];
    for (const [edge, band] of CLO_BAND_EDGES) {
      const below = order[order.indexOf(band) - 1];
      const mid = (BAND_PLAN_CLO[below] + BAND_PLAN_CLO[band]) / 2;
      expect(Math.abs(edge - mid)).toBeLessThanOrEqual(0.05);
    }
  });
});

describe('nearCloEdge', () => {
  it('flags targets within the hedge of an edge', () => {
    expect(nearCloEdge(1.25 + CLO_EDGE_HEDGE - 0.001)).toBe(true);
    expect(nearCloEdge(1.25 + CLO_EDGE_HEDGE + 0.01)).toBe(false);
    expect(nearCloEdge(0.36)).toBe(false);
    expect(nearCloEdge(1.38, CLO_EDGE_HEDGE_WIDE)).toBe(true);
    expect(nearCloEdge(1.38)).toBe(false);
  });
});

describe('clothingTarget', () => {
  const cold = wx(LONDON, '2026-11-26T12:00:00Z', 3, 25, 85, 1);

  it('takes the hardest hour of the window', () => {
    const mild = wx(LONDON, '2026-11-26T12:00:00Z', 12, 5, 70, 1);
    const both = walk([mild, cold]);
    expect(both.icl).toBeCloseTo(walk([cold]).icl, 6);
    expect(both.icl).toBeGreaterThan(walk([mild]).icl);
  });

  it('adds the bias after the maximum and records it', () => {
    const t = clothingTarget({ hours: [cold], activity: 'walking', exposureHours: 0.5, bias: 0.2 });
    expect(t.icl).toBeCloseTo(walk([cold]).icl + 0.2, 6);
    expect(t.bias).toBe(0.2);
  });

  it('never goes below zero and treats a non-finite bias as none', () => {
    const hot = wx(MADRID, '2026-07-15T12:00:00Z', 30, 5, 30, 0);
    expect(clothingTarget({ hours: [hot], activity: 'walking', exposureHours: 0.5, bias: -2 }).icl).toBe(0);
    expect(clothingTarget({ hours: [cold], activity: 'walking', exposureHours: 0.5, bias: NaN }).bias).toBe(0);
  });

  it('asks for nothing but the bias with no hours outside', () => {
    const t = clothingTarget({ hours: [], activity: 'walking', exposureHours: 1, bias: 0.1 });
    expect(t).toMatchObject({ icl: 0.1, basis: 'heat-ladder', exposureHours: 1 });
  });

  it('reports the steady-state floor and neutral of the hardest hour', () => {
    const t = walk([cold]);
    const h = targetHour(cold, 'walking', undefined, 0.5);
    expect(t.floor).toBe(h.iclMin);
    expect(t.neutral).toBe(h.iclNeutral);
    expect(t.floor).toBeLessThan(t.neutral);
  });

  it('dresses for neutral while a coat outfit can reach it', () => {
    const cool = wx(LONDON, '2026-11-26T12:00:00Z', 9, 10, 75, 1);
    const t = walk([cool]);
    expect(t.icl).toBeCloseTo(Math.min(t.neutral, BAND_PLAN_CLO.coat), 2);
  });

  it('needs less for a shorter time outside in hard cold', () => {
    const oslo = wx(OSLO, '2026-01-15T11:00:00Z', -10, 15, 80, 1);
    const short = clothingTarget({ hours: [oslo], activity: 'walking', exposureHours: 0.25, bias: 0 });
    const long = clothingTarget({ hours: [oslo], activity: 'walking', exposureHours: 2, bias: 0 });
    expect(long.icl).toBeGreaterThan(short.icl);
  });

  it('uses the heat ladder above 20 °C and in heat stress', () => {
    const warm = targetHour(wx(LONDON, '2026-06-20T20:00:00Z', 22, 10, 60, 1), 'walking', undefined, 0.5);
    expect(warm.basis).toBe('heat-ladder');
    expect([BAND_PLAN_CLO.tshirt, BAND_PLAN_CLO.light]).toContain(warm.icl);
  });

  it('never asks for less as the air cools', () => {
    for (const cloud of [0, 0.6, 1]) {
      let prev = 0;
      for (let ta = 25; ta >= -15; ta -= 0.5) {
        const icl = walk([wx(LONDON, '2026-03-20T12:00:00Z', ta, 12, 70, cloud)]).icl;
        expect(icl, `${ta} ${cloud}`).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = icl;
      }
    }
  });

  it('marks the IREQ extension between 10 and 20 °C', () => {
    expect(walk([wx(LONDON, '2026-04-20T12:00:00Z', 13, 15, 70, 1)]).basis).toBe('ireq-extended');
    expect(walk([cold]).basis).toBe('ireq');
  });

  it('counts the sun fully up to 5 °C and not at all from 15 °C', () => {
    const sunny = (ta: number) => wx(LONDON, '2026-04-20T12:00:00Z', ta, 8, 60, 0);
    const shade = (ta: number): Weather => ({ ...sunny(ta), tmrt: ta });
    expect(walk([sunny(15)]).icl).toBeCloseTo(walk([shade(15)]).icl, 6);
    expect(walk([sunny(4)]).icl).toBeLessThan(walk([shade(4)]).icl - 0.2);
  });
});

/**
 * Sprint 5 golden days, verdict column, at this stage of the pipeline. Each
 * case is checked across the hours someone might walk, so a pass does not
 * hang on one lucky hour.
 */
describe('golden days', () => {
  const bandOf = (hours: Weather[], activity: Activity = 'walking') => bandForClo(walk(hours, activity).icl);

  it('London, 26 Nov: 3 °C, 25 km/h, showers, overcast → coat', () => {
    for (const iso of hoursOf('2026-11-26', 7, 17)) expect(bandOf([wx(LONDON, iso, 3, 25, 88, 1)]), iso).toBe('coat');
  });

  it('mild and sunny: 15 °C, light wind, clear, midday → two', () => {
    for (const iso of hoursOf('2026-04-20', 10, 14)) {
      // Light breeze, Beaufort 2: 6–11 km/h.
      for (const kmh of [6, 8, 11]) expect(bandOf([wx(LONDON, iso, 15, kmh, 60, 0)]), `${iso} ${kmh}`).toBe('two');
    }
  });

  it('Madrid, summer: 28 °C, calm, clear, UV 8 → tshirt', () => {
    for (const iso of hoursOf('2026-07-15', 9, 16)) expect(bandOf([wx(MADRID, iso, 28, 3, 35, 0)]), iso).toBe('tshirt');
  });

  it('Oslo, January: −10 °C, 15 km/h, dry, overcast → bundle', () => {
    for (const iso of hoursOf('2026-01-15', 8, 14)) expect(bandOf([wx(OSLO, iso, -10, 15, 80, 1)]), iso).toBe('bundle');
  });

  it('sun against cloud: 8 °C calm and clear at noon is at least one band lighter than windy overcast', () => {
    const clear = bandOf([wx(LONDON, '2026-11-26T12:00:00Z', 8, 3, 75, 0)]);
    const overcast = bandOf([wx(LONDON, '2026-11-26T12:00:00Z', 8, 30, 75, 1)]);
    expect(bandRank(clear)).toBeLessThan(bandRank(overcast));
  });

  it('cycling the London day is never lighter than walking it', () => {
    for (const iso of hoursOf('2026-11-26', 7, 17)) {
      const w = [wx(LONDON, iso, 3, 25, 88, 1)];
      for (const effort of ['easy', 'steady', 'hard'] as const) {
        const ride = clothingTarget({ hours: w, activity: 'cycling', effort, exposureHours: 0.5, bias: 0 });
        expect(bandRank(bandForClo(ride.icl)), `${iso} ${effort}`).toBeGreaterThanOrEqual(bandRank(bandOf(w)));
      }
    }
  });

  it('cycling is never lighter than walking from −10 to 25 °C', () => {
    for (let ta = -10; ta <= 25; ta += 1) {
      const w = [wx(LONDON, '2026-03-20T12:00:00Z', ta, 15, 70, 0.5)];
      expect(walk(w, 'cycling').icl, `${ta}`).toBeGreaterThanOrEqual(walk(w).icl - 1e-9);
    }
  });
});
