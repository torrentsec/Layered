// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { BANDS, bandFor } from '../bands';
import { extrasFor, windowStats, type WindowStats } from '../extras';
import type { Level } from '../inventory';
import {
  BOTTOMS,
  EDGE_HEDGE,
  FOOTWEAR,
  INSULATION_STEPS,
  RAIN_TOLERANCE,
  WIND_PROTECTION,
  WIND_TOLERANCE_SHIFT,
  bottomsFor,
  footwearFor,
  insulationPoints,
  insulationTarget,
  layerPlan,
  layersForTarget,
  nearBandEdge,
  rainProtection,
  requirementsFor,
  windProtection,
} from '../requirements';
import type { ExtraId } from '../types';
import { day } from './fixtures';

const STILL: WindowStats = { maxProb: 0, totalPrecip: 0, maxGust: 0, maxWind: 0, maxUv: 0, snow: false, dark: false, warming: 0 };
const stats = (over: Partial<WindowStats> = {}): WindowStats => ({ ...STILL, ...over });
const ex = (...ids: ExtraId[]) => ids.map((id) => ({ id, label: id, tone: 'info' as const, reason: '' }));

describe('insulation target', () => {
  it.each(INSULATION_STEPS.filter((s) => Number.isFinite(s.min)).map((s, i) => [s.min, s.points, INSULATION_STEPS[i + 1].points]))(
    'steps at %s° to %s points (just below: %s)',
    (min, points, below) => {
      expect(insulationTarget(min + 0.1)).toBe(points);
      expect(insulationTarget(min)).toBe(points);
      expect(insulationTarget(min - 0.1)).toBe(below);
    },
  );

  it('grades inside a band, not only at its edges', () => {
    expect(insulationTarget(16)).toBeLessThan(insulationTarget(13));
    expect(insulationTarget(-8)).toBeGreaterThan(insulationTarget(1));
    expect(bandFor(16).id).toBe(bandFor(13).id);
  });

  it('never decreases as it gets colder', () => {
    for (let t = 30; t > -20; t -= 0.1) expect(insulationTarget(t - 0.1)).toBeGreaterThanOrEqual(insulationTarget(t));
  });

  it('derives the same layer plan as the band, at every temperature', () => {
    for (let t = -20; t <= 35; t = Math.round((t + 0.1) * 10) / 10) {
      expect(layersForTarget(insulationTarget(t))).toEqual(layerPlan(bandFor(t).id));
    }
  });

  it('band edges carry their band plan points', () => {
    for (const b of BANDS.filter((x) => Number.isFinite(x.min))) {
      expect(insulationTarget(b.min)).toBe(insulationPoints(layerPlan(b.id)));
    }
    expect(insulationTarget(-30)).toBe(insulationPoints(layerPlan('bundle')));
  });

  it('caps the plan at the warmest one available', () => {
    expect(layersForTarget(20)).toEqual(layerPlan('bundle'));
    expect(layersForTarget(0)).toEqual(layerPlan('tshirt'));
  });

  it('is what requirementsFor reports', () => {
    const r = requirementsFor({ effective: 16, band: 'two', stats: STILL, extras: [], activity: 'walking' });
    expect(r.insulation).toBe(3);
    expect(r.layers).toEqual(layerPlan('two'));
  });
});

describe('wind protection', () => {
  const tiers: Level[] = ['low', 'medium', 'high'];
  const prev = (l: Level) => (l === 'low' ? 'none' : tiers[tiers.indexOf(l) - 1]);

  it.each(tiers.flatMap((tier) => tiers.map((tol) => [tier, tol] as const)))('%s tier, %s tolerance, sustained and gusts', (tier, tol) => {
    const shift = WIND_TOLERANCE_SHIFT[tol];
    const w = WIND_PROTECTION[tier].wind + shift;
    const g = WIND_PROTECTION[tier].gust + shift;
    // keep the other measure low so each edge is tested on its own
    expect(windProtection({ maxWind: w, maxGust: 0 }, tol)).toBe(prev(tier));
    expect(windProtection({ maxWind: w + 0.1, maxGust: 0 }, tol)).toBe(tier);
    expect(windProtection({ maxWind: w - 0.1, maxGust: 0 }, tol)).toBe(prev(tier));
    expect(windProtection({ maxWind: 0, maxGust: g }, tol)).toBe(prev(tier));
    expect(windProtection({ maxWind: 0, maxGust: g + 0.1 }, tol)).toBe(tier);
    expect(windProtection({ maxWind: 0, maxGust: g - 0.1 }, tol)).toBe(prev(tier));
  });

  it('protects earlier with low tolerance and later with high', () => {
    const breezy = { maxWind: 22, maxGust: 0 };
    expect(windProtection(breezy, 'low')).toBe('medium');
    expect(windProtection(breezy)).toBe('low');
    const light = { maxWind: 18, maxGust: 0 };
    expect(windProtection(light)).toBe('low');
    expect(windProtection(light, 'high')).toBe('none');
  });

  it('defaults to medium tolerance', () => {
    expect(windProtection({ maxWind: 26, maxGust: 0 })).toBe(windProtection({ maxWind: 26, maxGust: 0 }, 'medium'));
  });

  it('is separate from insulation', () => {
    const calm = requirementsFor({ effective: 10, band: 'jacket', stats: STILL, extras: [], activity: 'walking' });
    const gale = requirementsFor({ effective: 10, band: 'jacket', stats: stats({ maxWind: 50, maxGust: 80 }), extras: [], activity: 'walking' });
    expect(calm.wind).toBe('none');
    expect(gale.wind).toBe('high');
    expect(gale.insulation).toBe(calm.insulation);
    expect(gale.layers).toEqual(calm.layers);
  });

  it('reads wind tolerance from the comfort profile', () => {
    const s = stats({ maxWind: 22 });
    const base = { effective: 10, band: 'jacket' as const, stats: s, extras: [], activity: 'walking' as const };
    expect(requirementsFor(base).wind).toBe('low');
    expect(requirementsFor({ ...base, comfort: { sensitivity: 'average', windTolerance: 'low' } }).wind).toBe('medium');
    expect(requirementsFor({ ...base, comfort: { sensitivity: 'average', windTolerance: 'high' } }).wind).toBe('low');
  });
});

describe('rain protection', () => {
  it('follows the extras when tolerance is unset or medium', () => {
    for (const tol of [undefined, 'medium'] as const) {
      expect(rainProtection([], stats(), tol)).toBe('none');
      expect(rainProtection(ex('umbrella'), stats({ maxProb: 30 }), tol)).toBe('umbrella');
      expect(rainProtection(ex('umbrella', 'waterproof'), stats({ maxProb: 60 }), tol)).toBe('waterproof');
      expect(rainProtection(ex('hood'), stats({ maxProb: 30 }), tol)).toBe('hood');
    }
  });

  it('matches extrasFor at its own edges with no tolerance', () => {
    for (const p of [29, 30, 31, 59, 60, 61]) {
      const s = stats({ maxProb: p });
      const r = requirementsFor({ effective: 10, band: 'jacket', stats: s, extras: extrasFor(s, 10, 'walking'), activity: 'walking' });
      expect(r.rain).toBe(p < 30 ? 'none' : p < 60 ? 'umbrella' : 'waterproof');
    }
  });

  describe('high tolerance raises the umbrella threshold', () => {
    const u = RAIN_TOLERANCE.high.umbrellaProb;
    it.each([
      [u - 1, 'none'],
      [u, 'umbrella'],
      [u + 1, 'umbrella'],
    ] as const)('%s%% chance gives %s', (p, want) => {
      expect(rainProtection(ex('umbrella'), stats({ maxProb: p }), 'high')).toBe(want);
    });
    it('drops a hood for a passing shower too', () => {
      expect(rainProtection(ex('hood'), stats({ maxProb: u - 1, maxGust: 60 }), 'high')).toBe('none');
      expect(rainProtection(ex('hood'), stats({ maxProb: u, maxGust: 60 }), 'high')).toBe('hood');
    });
    it('still wants a waterproof for proper rain', () => {
      expect(rainProtection(ex('waterproof'), stats({ maxProb: 20, totalPrecip: 1 }), 'high')).toBe('waterproof');
      expect(rainProtection(ex('umbrella', 'waterproof'), stats({ maxProb: 60 }), 'high')).toBe('waterproof');
    });
  });

  describe('low tolerance wants a waterproof earlier', () => {
    const { waterproofProb: wp, waterproofMm: mm } = RAIN_TOLERANCE.low;
    it.each([
      [wp - 1, 'umbrella'],
      [wp, 'waterproof'],
      [wp + 1, 'waterproof'],
    ] as const)('%s%% chance gives %s', (p, want) => {
      expect(rainProtection(ex('umbrella'), stats({ maxProb: p }), 'low')).toBe(want);
    });
    it.each([
      [mm - 0.1, 'umbrella'],
      [mm, 'waterproof'],
      [mm + 0.1, 'waterproof'],
    ] as const)('%s mm gives %s', (amount, want) => {
      expect(rainProtection(ex('umbrella'), stats({ maxProb: 35, totalPrecip: amount }), 'low')).toBe(want);
    });
    it('keeps a hood and a dry day as they are', () => {
      expect(rainProtection(ex('hood'), stats({ maxProb: 50 }), 'low')).toBe('hood');
      expect(rainProtection([], stats({ maxProb: 20 }), 'low')).toBe('none');
    });
  });

  it('reads rain tolerance from the comfort profile and feeds footwear', () => {
    const s = stats({ maxProb: 50 });
    const base = { effective: 18, band: 'light' as const, stats: s, extras: extrasFor(s, 18, 'walking'), activity: 'walking' as const };
    expect(requirementsFor(base).rain).toBe('umbrella');
    expect(requirementsFor(base).footwear).toBe('closed');
    const low = requirementsFor({ ...base, comfort: { sensitivity: 'average', rainTolerance: 'low' } });
    expect(low.rain).toBe('waterproof');
    expect(low.footwear).toBe('waterproof');
    const s2 = stats({ maxProb: 35 });
    const high = requirementsFor({ ...base, stats: s2, extras: extrasFor(s2, 18, 'walking'), comfort: { sensitivity: 'average', rainTolerance: 'high' } });
    expect(high.rain).toBe('none');
    expect(high.footwear).toBe('any');
  });
});

describe('bottoms', () => {
  it.each([
    [BOTTOMS.shorts, 'shorts', 'light'],
    [BOTTOMS.light, 'light', 'standard'],
    [BOTTOMS.standard, 'standard', 'heavy'],
  ] as const)('at %s° gives %s, just below %s', (edge, at, below) => {
    expect(bottomsFor(edge + 0.1)).toBe(at);
    expect(bottomsFor(edge)).toBe(at);
    expect(bottomsFor(edge - 0.1)).toBe(below);
  });
});

describe('footwear', () => {
  it.each([
    [FOOTWEAR.open, 'open', 'any'],
    [FOOTWEAR.any, 'any', 'closed'],
  ] as const)('dry at %s° gives %s, just below %s', (edge, at, below) => {
    expect(footwearFor(edge + 0.1, 'none', false)).toBe(at);
    expect(footwearFor(edge, 'none', false)).toBe(at);
    expect(footwearFor(edge - 0.1, 'none', false)).toBe(below);
  });

  it('closes up for an umbrella, waterproofs for proper rain', () => {
    expect(footwearFor(25, 'umbrella', false)).toBe('closed');
    expect(footwearFor(25, 'waterproof', false)).toBe('waterproof');
    expect(footwearFor(25, 'hood', false)).toBe('waterproof');
  });

  it('wants boots for snow, whatever the rain', () => {
    expect(footwearFor(0, 'waterproof', true)).toBe('boots');
    expect(footwearFor(0, 'none', true)).toBe('boots');
  });

  it('takes snow from the stats or the boots extra', () => {
    const base = { effective: 0, band: 'bundle' as const, extras: [], activity: 'walking' as const };
    expect(requirementsFor({ ...base, stats: stats({ snow: true }) }).footwear).toBe('boots');
    expect(requirementsFor({ ...base, stats: STILL, extras: ex('boots') }).footwear).toBe('boots');
    expect(requirementsFor({ ...base, stats: STILL }).footwear).toBe('closed');
  });
});

describe('removable', () => {
  const at = (effective: number, s: WindowStats = STILL, extras = ex()) =>
    requirementsFor({ effective, band: bandFor(effective).id, stats: s, extras, activity: 'walking' });

  it.each(BANDS.filter((b) => Number.isFinite(b.min)).map((b) => b.min))('hedges within %s° ± 1°', (edge) => {
    expect(nearBandEdge(edge)).toBe(true);
    expect(nearBandEdge(edge + EDGE_HEDGE)).toBe(true);
    expect(nearBandEdge(edge - EDGE_HEDGE)).toBe(true);
    expect(nearBandEdge(edge + EDGE_HEDGE + 0.1)).toBe(false);
    expect(nearBandEdge(edge - EDGE_HEDGE - 0.1)).toBe(false);
  });

  it('is off in the middle of a band', () => {
    for (const t of [4.5, 9.5, 14.5, 19.5, 25, -5]) {
      expect(nearBandEdge(t)).toBe(false);
      expect(at(t).removable).toBe(false);
    }
  });

  it('is on just inside the hedge and off just outside', () => {
    expect(at(13).removable).toBe(true);
    expect(at(13).removableWhy).toBe('edge');
    expect(at(13.1).removable).toBe(false);
    expect(at(10.9).removable).toBe(false);
    expect(at(11).removable).toBe(true);
  });

  it('is on when the window warms by the swing threshold', () => {
    expect(at(9.5, stats({ warming: 4.9 })).removable).toBe(false);
    expect(at(9.5, stats({ warming: 5 })).removable).toBe(true);
    expect(at(9.5, stats({ warming: 5 })).removableWhy).toBe('warming');
    expect(at(9.5, STILL, ex('swing')).removable).toBe(true);
  });

  it('follows the swing extra from a real window', () => {
    const hours = day(6, (i) => ({ feels: 8 + i * 1.2 }));
    const s = windowStats(hours);
    const r = requirementsFor({ effective: 8, band: 'jacket', stats: s, extras: extrasFor(s, 8, 'walking'), activity: 'walking' });
    expect(r.removable).toBe(true);
    expect(r.removableWhy).toBe('warming');
  });
});
