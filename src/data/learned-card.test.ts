// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { Rating } from '../engine/types';
import { biasPrior, replayBias } from '../engine/science/personal';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { dailyStates, learnedCardOn } from './learned-card';

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('learnedCardOn', () => {
  it('is off by default', () => {
    expect(learnedCardOn('', memory())).toBe(false);
  });

  it('turns on from the URL and stays on until turned off', () => {
    const s = memory();
    expect(learnedCardOn('?spike=learned-card', s)).toBe(true);
    expect(learnedCardOn('', s)).toBe(true);
    expect(learnedCardOn('?spike=off', s)).toBe(false);
    expect(learnedCardOn('', s)).toBe(false);
  });

  it('honours the URL when storage throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined };
    expect(learnedCardOn('?spike=learned-card', broken)).toBe(true);
    expect(learnedCardOn('', broken)).toBe(false);
  });
});

describe('dailyStates', () => {
  const prior = biasPrior(DEFAULT_COMFORT, 0);
  const r = (date: string, rating: -1 | 0 | 1): Rating => ({ date, rating, effective: 8, activity: 'walking' });

  it('gives one state per rated day, ending at the store bias', () => {
    const ratings = [r('2026-11-03', -1), r('2026-11-01', -1), r('2026-11-03', 0)];
    const states = dailyStates(prior, ratings);
    expect(states).toHaveLength(2);
    expect(states[0].count).toBe(1);
    expect(states[1]).toEqual(replayBias(prior, ratings));
  });

  it('is empty with no ratings', () => {
    expect(dailyStates(prior, [])).toEqual([]);
  });
});
