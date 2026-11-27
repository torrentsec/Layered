// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { bandRank } from '../../bands';
import { bandMargin, isClose, MARGIN_CLOSE, MARGIN_MAX, MARGIN_STEP, type MarginInput } from '../margin';
import { bandForClo, clothingTarget } from '../target';
import type { Weather } from '../types';

const hour = (ta: number, over: Partial<Weather> = {}): Weather => ({ ta, rh: 75, wind10: 4, tmrt: ta - 2, radiation: 'forecast', ...over });
const walk = (hours: Weather[], over: Partial<MarginInput> = {}): MarginInput => ({ hours, activity: 'walking', exposureHours: 0.5, bias: 0, ...over });
const bandAt = (x: MarginInput, k: number) =>
  bandForClo(clothingTarget({ ...x, hours: x.hours.map((w) => ({ ...w, ta: w.ta + k, tmrt: w.tmrt + k })) }).icl);

describe('bandMargin', () => {
  it('starts from the band the clothing target gives', () => {
    for (const ta of [-10, 0, 12, 15, 25]) {
      const x = walk([hour(ta)]);
      expect(bandMargin(x).band).toBe(bandForClo(clothingTarget(x).icl));
    }
  });

  it('finds the smallest shift that changes the band, on the search step', () => {
    for (const ta of [-10, 10, 12, 15, 18, 20]) {
      const x = walk([hour(ta)]);
      const m = bandMargin(x);
      for (const [t, sign] of [[m.warmer, 1], [m.colder, -1]] as const) {
        if (!t) continue;
        expect(t.by % MARGIN_STEP).toBeCloseTo(0);
        expect(bandAt(x, sign * t.by)).toBe(t.band);
        if (t.by > MARGIN_STEP) expect(bandAt(x, sign * (t.by - MARGIN_STEP))).toBe(m.band);
      }
    }
  });

  it('goes lighter when warmer and warmer when colder', () => {
    const m = bandMargin(walk([hour(15)]));
    expect(bandRank(m.warmer!.band)).toBeLessThan(bandRank(m.band));
    expect(bandRank(m.colder!.band)).toBeGreaterThan(bandRank(m.band));
  });

  it('leaves a direction out when the band holds past the reach', () => {
    const hot = bandMargin(walk([hour(30, { tmrt: 50, wind10: 1, rh: 40 })]));
    expect(hot.band).toBe('tshirt');
    expect(hot.warmer).toBeUndefined();
    const cold = bandMargin(walk([hour(-15)]));
    expect(cold.band).toBe('bundle');
    expect(cold.colder).toBeUndefined();
    expect([hot.colder, cold.warmer].every((t) => !t || t.by <= MARGIN_MAX)).toBe(true);
  });

  it('reads the hardest hour, as the advice does', () => {
    const both = bandMargin(walk([hour(15), hour(10)]));
    expect(both.band).toBe(bandMargin(walk([hour(10)])).band);
  });

  it('carries the personal bias into every rerun', () => {
    const warm = bandMargin(walk([hour(15)], { bias: 0.3 }));
    expect(bandRank(warm.band)).toBeGreaterThan(bandRank(bandMargin(walk([hour(15)])).band));
  });

  it('copes with no hours outside', () => {
    expect(bandMargin(walk([]))).toEqual({ band: 'tshirt' });
  });
});

describe('isClose', () => {
  it('is true only within the close shift', () => {
    expect(isClose({ band: 'two', colder: { by: MARGIN_CLOSE, band: 'jacket' } })).toBe(true);
    expect(isClose({ band: 'two', warmer: { by: MARGIN_CLOSE + MARGIN_STEP, band: 'light' } })).toBe(false);
    expect(isClose({ band: 'coat' })).toBe(false);
  });
});
