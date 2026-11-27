// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { activityOffsets, addRating, learnedFor, learnOffset, LEARN_CAP } from '../learning';
import { advise } from '../advise';
import type { Rating } from '../types';
import { day } from './fixtures';

const r = (date: string, rating: -1 | 0 | 1, activity: Rating['activity'] = 'walking'): Rating => ({ date, rating, effective: 8, activity });

describe('learning', () => {
  it('nudges by 0.5° per rating', () => {
    expect(learnOffset([r('2026-11-26', -1)], '2026-11-26')).toBe(-0.5);
    expect(learnOffset([r('2026-11-26', 1), r('2026-11-25', 1)], '2026-11-26')).toBe(1);
  });
  it('ignores "just right"', () => {
    expect(learnOffset([r('2026-11-26', 0)], '2026-11-26')).toBe(0);
  });
  it('caps at ±5°', () => {
    const many = Array.from({ length: 40 }, () => r('2026-11-26', -1));
    expect(learnOffset(many, '2026-11-26')).toBe(-LEARN_CAP);
  });
  it('weights recent feedback more', () => {
    expect(learnOffset([r('2026-10-27', -1)], '2026-11-26')).toBe(-0.3);
    const mixed = [r('2026-08-01', 1), r('2026-11-26', -1)];
    expect(learnOffset(mixed, '2026-11-26')).toBeLessThan(0);
  });
  it('uses the per-activity offset once there are enough ratings', () => {
    const ratings = [r('2026-11-26', -1, 'cycling'), r('2026-11-25', -1, 'cycling'), r('2026-11-24', -1, 'cycling'), r('2026-11-26', 1, 'walking')];
    expect(learnedFor(ratings, 'cycling', '2026-11-26')).toEqual({ offset: -1.5, from: 'activity' });
    expect(learnedFor(ratings, 'walking', '2026-11-26').from).toBe('all');
    expect(learnedFor([], 'walking', '2026-11-26')).toEqual({ offset: 0, from: 'none' });
  });
  it('replaces a same-day rating for the same activity', () => {
    const list = addRating([r('2026-11-26', -1)], r('2026-11-26', 1));
    expect(list).toHaveLength(1);
    expect(list[0].rating).toBe(1);
  });
  it('feeds into the effective temperature', () => {
    const a = advise({ hours: day(2, () => ({ feels: 10 })), activity: 'walking', ratings: [r('2026-11-26', -1)], today: '2026-11-26' })!;
    expect(a.effective).toBe(9.5);
    expect(a.why.learnedOffset).toBe(-0.5);
  });
});

describe('activityOffsets', () => {
  it('lists only activities with enough ratings, most rated first', () => {
    const ratings = [
      ...['2026-11-26', '2026-11-25', '2026-11-24', '2026-11-23'].map((d) => r(d, 1, 'cycling')),
      ...['2026-11-26', '2026-11-25', '2026-11-24'].map((d) => r(d, -1, 'walking')),
      r('2026-11-26', -1, 'running'),
    ];
    expect(activityOffsets(ratings, '2026-11-26')).toEqual([
      { activity: 'cycling', offset: learnOffset(ratings.slice(0, 4), '2026-11-26'), count: 4 },
      { activity: 'walking', offset: learnOffset(ratings.slice(4, 7), '2026-11-26'), count: 3 },
    ]);
  });
  it('is empty without ratings', () => {
    expect(activityOffsets([], '2026-11-26')).toEqual([]);
  });
});

describe('addRating with detail and corrections (US-036, US-037)', () => {
  it('replaces the whole rating for the day, so a cleared correction is gone', () => {
    const first: Rating = { ...r('2026-11-26', 1), detail: 'too-many-layers', corrections: [{ category: 'coat', thickness: 'thick', verdict: 'too-warm' }] };
    const second: Rating = r('2026-11-26', 1);
    expect(addRating(addRating([], first), second)).toEqual([second]);
  });
  it('keeps other activities on the same day', () => {
    const walk: Rating = { ...r('2026-11-26', 0), corrections: [{ category: 'coat', thickness: 'medium', verdict: 'too-cool' }] };
    expect(addRating([walk], r('2026-11-26', 1, 'cycling'))).toHaveLength(2);
  });
});
