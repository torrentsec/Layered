// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { addRating, learnedFor, learnOffset, LEARN_CAP } from '../learning';
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
