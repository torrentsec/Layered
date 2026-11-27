// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { beforeEach, describe, expect, it } from 'vitest';
import { CLO_PER_CELSIUS } from '../engine/science/bias';
import { biasPrior, replayBias } from '../engine/science/personal';
import { addRating } from '../engine/learning';
import type { Rating } from '../engine/types';
import { biasState, currentBias } from './bias';
import { DEFAULT_SETTINGS, cloBias, comfort, exportBundle, importBundle, patchSettings, ratings, settings } from './store';

const r = (date: string, rating: -1 | 0 | 1): Rating => ({ date, rating, effective: 8, activity: 'walking' });

beforeEach(() => {
  settings.value = DEFAULT_SETTINGS;
  comfort.value = { sensitivity: 'average' };
  ratings.value = [];
});

describe('stored clo bias', () => {
  it('is personal before any vote: it starts from the °C comfort offset', () => {
    comfort.value = { sensitivity: 'cold' };
    expect(currentBias()).toBeCloseTo(2 * CLO_PER_CELSIUS, 10);
    patchSettings({ manualOffset: 1 });
    expect(currentBias()).toBeCloseTo(1 * CLO_PER_CELSIUS, 10);
  });

  it('updates on each new vote', () => {
    ratings.value = addRating(ratings.value, r('2026-11-26', -1));
    const once = biasState();
    expect(once.count).toBe(1);
    expect(once.mean).toBeGreaterThan(0);
    ratings.value = addRating(ratings.value, r('2026-11-27', -1));
    expect(biasState().count).toBe(2);
    expect(currentBias()).toBeGreaterThan(once.mean);
  });

  it('counts a changed vote once, not twice', () => {
    ratings.value = addRating(ratings.value, r('2026-11-26', -1));
    ratings.value = addRating(ratings.value, r('2026-11-26', 1));
    expect(biasState()).toEqual(replayBias(biasPrior(comfort.value, 0), [r('2026-11-26', 1)]));
  });

  it('travels in the export bundle', () => {
    ratings.value = [r('2026-11-26', -1)];
    expect(exportBundle().cloBias).toEqual(cloBias.value);
  });

  it('is rebuilt from the imported votes and profile, not taken on trust', () => {
    const b = {
      ...exportBundle(),
      comfort: { sensitivity: 'warm' as const },
      ratings: [r('2026-11-20', 1)],
      cloBias: { mean: 0.6, variance: 0, updated: '2030-01-01', count: 99 },
    };
    importBundle(b);
    expect(biasState()).toEqual(replayBias(biasPrior({ sensitivity: 'warm' }, 0), [r('2026-11-20', 1)]));
  });
});
