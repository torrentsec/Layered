// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Activity, Rating } from './types';

export const LEARN_STEP = 0.5;
export const LEARN_CAP = 5;
/** Feedback loses half its pull every month, so seasons and habits can shift. */
export const LEARN_HALF_LIFE_DAYS = 30;
/** Below this many ratings an activity borrows the all-activity offset. */
export const ACTIVITY_MIN_RATINGS = 3;

function daysBetween(a: string, b: string): number {
  return Math.max(0, (Date.parse(b) - Date.parse(a)) / 86_400_000);
}

// Round half away from zero so a decayed -0.25 reads as -0.3, mirroring +0.3.
const round1 = (n: number) => (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10;

/**
 * "Too cold" means the advice under-dressed you, so the offset moves down and
 * future effective temperatures read colder. Each rating is worth ±0.5° on the
 * day it is given and decays from there.
 */
export function learnOffset(ratings: Rating[], today: string): number {
  let sum = 0;
  for (const r of ratings) {
    if (r.rating === 0) continue;
    const weight = 0.5 ** (daysBetween(r.date, today) / LEARN_HALF_LIFE_DAYS);
    sum += r.rating * LEARN_STEP * weight;
  }
  const capped = Math.max(-LEARN_CAP, Math.min(LEARN_CAP, sum));
  return round1(capped) + 0; // + 0 turns -0 into 0
}

export interface Learned {
  offset: number;
  from: 'activity' | 'all' | 'none';
}

export function learnedFor(ratings: Rating[], activity: Activity, today: string): Learned {
  const own = ratings.filter((r) => r.activity === activity);
  if (own.length >= ACTIVITY_MIN_RATINGS) return { offset: learnOffset(own, today), from: 'activity' };
  if (ratings.length) return { offset: learnOffset(ratings, today), from: 'all' };
  return { offset: 0, from: 'none' };
}

/** Keeps a single rating per date and activity; the latest one wins. */
export function addRating(ratings: Rating[], next: Rating): Rating[] {
  return [...ratings.filter((r) => !(r.date === next.date && r.activity === next.activity)), next];
}
