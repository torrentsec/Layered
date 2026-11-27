// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { garmentWarmth, ratings } from '../data/store';
import type { Rating } from '../engine/types';
import { localToday, refreshGarmentWarmth } from './garment-warmth';

const rated = (date: string): Rating => ({
  date,
  rating: 1,
  effective: 6,
  activity: 'walking',
  corrections: [{ category: 'jumper', thickness: 'thick', verdict: 'too-warm' }],
});

describe('garment warmth cache', () => {
  it('formats the local date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
  it('follows the ratings, including a reset', () => {
    ratings.value = [rated('2026-11-26'), rated('2026-11-25')];
    refreshGarmentWarmth('2026-11-26');
    expect(garmentWarmth.value).toEqual({ 'jumper:thick': 1 });
    refreshGarmentWarmth('2026-12-26');
    expect(garmentWarmth.value['jumper:thick']).toBe(0.5);
    ratings.value = [];
    expect(garmentWarmth.value).toEqual({});
  });
});
