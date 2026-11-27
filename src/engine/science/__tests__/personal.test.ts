// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { BIAS_PRIOR_VARIANCE, CLO_PER_CELSIUS, migrateOffsetToClo, updateBias } from '../bias';
import { biasPrior, MOSTLY_INDOORS, replayBias } from '../personal';
import type { Rating } from '../../types';

const r = (date: string, rating: -1 | 0 | 1, activity: Rating['activity'] = 'walking'): Rating => ({ date, rating, effective: 8, activity });

describe('biasPrior', () => {
  it('starts an average person with no manual offset at zero', () => {
    expect(biasPrior({ sensitivity: 'average' }, 0)).toEqual(migrateOffsetToClo(0));
  });

  it('maps "feels the cold" (−2 °C) to dressing warmer', () => {
    expect(biasPrior({ sensitivity: 'cold' }, 0).mean).toBeCloseTo(2 * CLO_PER_CELSIUS, 10);
    expect(biasPrior({ sensitivity: 'warm' }, 0).mean).toBeCloseTo(-2 * CLO_PER_CELSIUS, 10);
  });

  it('adds the manual offset to the sensitivity', () => {
    expect(biasPrior({ sensitivity: 'cold' }, -1).mean).toBeCloseTo(3 * CLO_PER_CELSIUS, 10);
  });

  it('ignores per-activity preferences, which belong to per-activity offsets', () => {
    expect(biasPrior({ sensitivity: 'average', coldWhenStill: true, overheatWhenWalking: true }, 0).mean).toBe(0);
  });

  it('treats an unknown sensitivity or a broken manual offset as zero', () => {
    expect(biasPrior({ sensitivity: 'icy' as never }, Number.NaN)).toEqual(migrateOffsetToClo(0));
  });
});

describe('replayBias', () => {
  const prior = biasPrior({ sensitivity: 'average' }, 0);

  it('returns the prior when there are no votes', () => {
    expect(replayBias(prior, [])).toEqual(prior);
  });

  it('applies the stored votes through updateBias, oldest first', () => {
    const expected = updateBias(updateBias(prior, -1, '2026-11-01'), 1, '2026-11-20');
    expect(replayBias(prior, [r('2026-11-20', 1), r('2026-11-01', -1)])).toEqual(expected);
  });

  it('moves towards warmer clothes after "too cold" votes and counts each one', () => {
    const out = replayBias(prior, [r('2026-11-01', -1), r('2026-11-02', -1), r('2026-11-03', -1)]);
    expect(out.mean).toBeGreaterThan(0);
    expect(out.count).toBe(3);
    expect(out.variance).toBeLessThan(BIAS_PRIOR_VARIANCE);
  });

  it('down-weights votes from mostly indoor days', () => {
    expect(MOSTLY_INDOORS).toEqual(['office', 'indoors']);
    const out = replayBias(prior, [r('2026-11-01', -1, 'office')]);
    expect(out).toEqual(updateBias(prior, -1, '2026-11-01', { mostlyIndoors: true }));
    expect(out.mean).toBeLessThan(replayBias(prior, [r('2026-11-01', -1)]).mean);
  });

  it('skips stored votes that are not −1, 0 or 1', () => {
    const bad = { ...r('2026-11-01', 0), rating: 2 } as unknown as Rating;
    expect(replayBias(prior, [bad])).toEqual(prior);
  });

  it('gives the same answer whatever order same-day votes were stored in', () => {
    const a = replayBias(prior, [r('2026-11-01', -1, 'walking'), r('2026-11-01', 1, 'cycling')]);
    const b = replayBias(prior, [r('2026-11-01', 1, 'cycling'), r('2026-11-01', -1, 'walking')]);
    expect(a.mean).toBeCloseTo(b.mean, 12);
    expect(a.variance).toBeCloseTo(b.variance, 12);
  });
});
