// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import {
  correctablePieces,
  forgetAllGarments,
  forgetGarment,
  GARMENT_CAP,
  garmentKey,
  LAYERS_CAP,
  LAYERS_KEY,
  learnGarmentWarmth,
  parseGarmentKey,
  sameWarmth,
} from '../garment-learning';
import type { GarmentCorrection, Rating } from '../types';

const TODAY = '2026-11-26';
const warm: GarmentCorrection = { category: 'coat', thickness: 'medium', verdict: 'too-warm' };
const cool: GarmentCorrection = { category: 'coat', thickness: 'medium', verdict: 'too-cool' };
const r = (date: string, corrections?: GarmentCorrection[], detail?: Rating['detail']): Rating => ({
  date,
  rating: 0,
  effective: 6,
  activity: 'walking',
  ...(corrections ? { corrections } : {}),
  ...(detail ? { detail } : {}),
});

describe('learnGarmentWarmth', () => {
  it('learns nothing from no feedback', () => {
    expect(learnGarmentWarmth([], TODAY)).toEqual({});
    expect(learnGarmentWarmth([r(TODAY)], TODAY)).toEqual({});
  });

  it('never changes anything after a single correction', () => {
    expect(learnGarmentWarmth([r(TODAY, [warm])], TODAY)).toEqual({});
    expect(learnGarmentWarmth([r(TODAY, [cool])], TODAY)).toEqual({});
  });

  it('learns once two corrections agree', () => {
    expect(learnGarmentWarmth([r(TODAY, [warm]), r('2026-11-25', [warm])], TODAY)['coat:medium']).toBeCloseTo(1, 1);
    expect(learnGarmentWarmth([r(TODAY, [cool]), r('2026-11-25', [cool])], TODAY)['coat:medium']).toBeCloseTo(-1, 1);
  });

  it('treats "too warm" as a warmer garment and "too cool" as a cooler one', () => {
    const w = learnGarmentWarmth([r(TODAY, [warm]), r(TODAY, [warm])], TODAY);
    const c = learnGarmentWarmth([r(TODAY, [cool]), r(TODAY, [cool])], TODAY);
    expect(w['coat:medium']).toBeGreaterThan(0);
    expect(c['coat:medium']).toBeLessThan(0);
  });

  it('caps each garment at ±1 point', () => {
    const many = Array.from({ length: 12 }, () => r(TODAY, [warm]));
    expect(learnGarmentWarmth(many, TODAY)['coat:medium']).toBe(GARMENT_CAP);
    const cold = Array.from({ length: 12 }, () => r(TODAY, [cool]));
    expect(learnGarmentWarmth(cold, TODAY)['coat:medium']).toBe(-GARMENT_CAP);
  });

  it('lets conflicting corrections cancel', () => {
    expect(learnGarmentWarmth([r(TODAY, [warm]), r(TODAY, [cool])], TODAY)).toEqual({});
    expect(learnGarmentWarmth([r(TODAY, [warm]), r(TODAY, [warm]), r(TODAY, [cool]), r(TODAY, [cool])], TODAY)).toEqual({});
    // Three to one is a net of two, so it learns, but less than two clean votes would.
    const net = learnGarmentWarmth([r(TODAY, [warm]), r(TODAY, [warm]), r(TODAY, [warm]), r(TODAY, [cool])], TODAY);
    expect(net['coat:medium']).toBe(1);
    const lean = learnGarmentWarmth([r(TODAY, [warm]), r(TODAY, [warm]), r('2026-10-27', [warm]), r(TODAY, [cool])], TODAY);
    expect(lean['coat:medium']).toBeLessThan(1);
    expect(lean['coat:medium']).toBeGreaterThan(0);
  });

  it('decays with a 30-day half-life', () => {
    const month = learnGarmentWarmth([r('2026-10-27', [warm]), r('2026-10-27', [warm])], TODAY);
    expect(month['coat:medium']).toBe(0.5);
    const twoMonths = learnGarmentWarmth([r('2026-09-27', [warm]), r('2026-09-27', [warm])], TODAY);
    expect(twoMonths['coat:medium']).toBe(0.3);
  });

  it('drops entries that have decayed to nothing', () => {
    expect(learnGarmentWarmth([r('2025-01-01', [warm]), r('2025-01-01', [warm])], TODAY)).toEqual({});
  });

  it('keeps garments apart by category and thickness', () => {
    const thick: GarmentCorrection = { category: 'coat', thickness: 'thick', verdict: 'too-cool' };
    const jumper: GarmentCorrection = { category: 'jumper', thickness: 'medium', verdict: 'too-warm' };
    const w = learnGarmentWarmth([r(TODAY, [warm, thick, jumper]), r('2026-11-25', [warm, thick, jumper])], TODAY);
    expect(w).toEqual({ 'coat:medium': 1, 'coat:thick': -1, 'jumper:medium': 1 });
  });

  it('counts the same piece once per day', () => {
    expect(learnGarmentWarmth([r(TODAY, [warm, warm])], TODAY)).toEqual({});
  });

  it('ignores corrections without a thickness', () => {
    const jeans: GarmentCorrection = { category: 'jeans', verdict: 'too-cool' };
    expect(learnGarmentWarmth([r(TODAY, [jeans]), r(TODAY, [jeans])], TODAY)).toEqual({});
  });

  it('trims the insulation target after two "too many layers"', () => {
    expect(learnGarmentWarmth([r(TODAY, undefined, 'too-many-layers')], TODAY)).toEqual({});
    const two = learnGarmentWarmth([r(TODAY, undefined, 'too-many-layers'), r('2026-11-25', undefined, 'too-many-layers')], TODAY);
    expect(two[LAYERS_KEY]).toBe(-0.5);
    const many = Array.from({ length: 10 }, () => r(TODAY, undefined, 'too-many-layers'));
    expect(learnGarmentWarmth(many, TODAY)[LAYERS_KEY]).toBe(-LAYERS_CAP);
  });

  it('does not learn layers from "not enough protection"', () => {
    const n = [r(TODAY, undefined, 'not-enough-protection'), r(TODAY, undefined, 'not-enough-protection')];
    expect(learnGarmentWarmth(n, TODAY)).toEqual({});
  });

  it('stays separate from the temperature offset', () => {
    const cold: Rating = { ...r(TODAY, [warm]), rating: -1 };
    expect(learnGarmentWarmth([cold, { ...cold, date: '2026-11-25' }], TODAY)).toEqual({ 'coat:medium': 1 });
  });
});

describe('forgetting', () => {
  const ratings = [
    r(TODAY, [warm, { category: 'jumper', thickness: 'thin', verdict: 'too-cool' }], 'too-many-layers'),
    r('2026-11-25', [warm], 'too-many-layers'),
  ];

  it('forgets one garment and keeps the rest', () => {
    const next = forgetGarment(ratings, 'coat:medium');
    expect(next[0].corrections).toEqual([{ category: 'jumper', thickness: 'thin', verdict: 'too-cool' }]);
    expect(next[1].corrections).toBeUndefined();
    expect(next.every((x) => x.detail === 'too-many-layers' && x.rating === 0)).toBe(true);
    expect(learnGarmentWarmth(next, TODAY)['coat:medium']).toBeUndefined();
  });

  it('forgets the layers shift on its own', () => {
    const next = forgetGarment(ratings, LAYERS_KEY);
    expect(next.every((x) => x.detail === undefined && !!x.corrections)).toBe(true);
  });

  it('forgets every garment but keeps temperature ratings', () => {
    const keep: Rating = r(TODAY, undefined, 'not-enough-protection');
    const next = forgetAllGarments([...ratings, keep]);
    expect(next).toHaveLength(3);
    expect(next.every((x) => !x.corrections)).toBe(true);
    expect(next.map((x) => x.detail)).toEqual([undefined, undefined, 'not-enough-protection']);
    expect(learnGarmentWarmth(next, TODAY)).toEqual({});
  });
});

describe('correctablePieces', () => {
  it('lists owned upper layers once each, and skips generic advice, bottoms and shoes', () => {
    const pieces = correctablePieces([
      { kind: 'base', label: 'Long-sleeve top', category: 'longsleeve', thickness: 'medium', owned: 'owned' },
      { kind: 'mid', label: 'Jumper', thickness: 'medium', owned: 'unknown' },
      { kind: 'outer', label: 'Coat', category: 'coat', thickness: 'medium', nickname: 'navy parka', owned: 'owned' },
      { kind: 'outer', label: 'Coat', category: 'coat', thickness: 'medium', owned: 'owned' },
      { kind: 'bottoms', label: 'Jeans', category: 'jeans', owned: 'owned' },
      { kind: 'footwear', label: 'Boots', category: 'boots', owned: 'owned' },
    ]);
    expect(pieces).toEqual([
      { key: 'longsleeve:medium', name: 'Long-sleeve top', category: 'longsleeve', thickness: 'medium' },
      { key: 'coat:medium', name: 'Your navy parka', category: 'coat', thickness: 'medium' },
    ]);
  });
});

describe('keys', () => {
  it('round-trips category and thickness', () => {
    expect(parseGarmentKey(garmentKey('insulated-jacket', 'thick'))).toEqual({ category: 'insulated-jacket', thickness: 'thick' });
    expect(parseGarmentKey(LAYERS_KEY)).toBeNull();
    expect(parseGarmentKey('coat:huge')).toBeNull();
  });
  it('compares maps by value', () => {
    expect(sameWarmth({ a: 1 }, { a: 1 })).toBe(true);
    expect(sameWarmth({ a: 1 }, { a: 0.5 })).toBe(false);
    expect(sameWarmth({ a: 1 }, {})).toBe(false);
  });
});
