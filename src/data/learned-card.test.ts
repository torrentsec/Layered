// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { Rating } from '../engine/types';
import { biasPrior, replayBias } from '../engine/science/personal';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { dailyStates } from './learned-card';

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
