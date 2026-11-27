// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { Rating } from '../engine/types';
import { biasPrior, replayBias } from '../engine/science/personal';
import { describeBias, leanOf, type LeanLabel } from '../engine/science/learned';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { rng } from '../engine/science/__tests__/learned-sim';
import { learnedSummary } from './learned-card';

const prior = biasPrior(DEFAULT_COMFORT, 0);
const r = (date: string, rating: -1 | 0 | 1, extra: Partial<Rating> = {}): Rating => ({ date, rating, effective: 8, activity: 'walking', ...extra });
const iso = (day: number) => new Date(Date.UTC(2026, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);

/** The Sprint 7 spike's way: replay every prefix of days, then carry the label through. */
function quadratic(ratings: Rating[]) {
  const dates = [...new Set(ratings.map((x) => x.date))].sort();
  const states = dates.map((d) => replayBias(prior, ratings.filter((x) => x.date <= d)));
  if (!states.length) return describeBias(prior);
  let prev: LeanLabel | undefined;
  for (let i = 0; i < states.length - 1; i++) prev = leanOf(states[i].mean, prev);
  return describeBias(states[states.length - 1], { previous: prev });
}

/** Seeded votes leaning one way, some days twice, some with clo recorded. */
function votes(seed: number, lean: number): Rating[] {
  const next = rng(seed);
  const out: Rating[] = [];
  for (let d = 0; d < 60; d++) {
    if (next() > 0.7) continue;
    const x = next() + lean;
    const rating = x > 0.8 ? -1 : x < 0.2 ? 1 : 0;
    const clo = next() < 0.5 ? { wornClo: 1 + next() * 0.3, targetClo: 1.1 } : {};
    out.push(r(iso(d), rating, clo));
    if (next() < 0.1) out.push(r(iso(d), 0, { activity: 'cycling' }));
  }
  return out;
}

describe('learnedSummary', () => {
  it('speaks from the settings with no ratings', () => {
    expect(learnedSummary(prior, [])).toEqual(describeBias(prior));
  });

  it('ends at the store bias, with the label from the day before', () => {
    const ratings = [r('2026-11-03', -1), r('2026-11-01', -1), r('2026-11-03', 0)];
    const previous = leanOf(replayBias(prior, [ratings[1]]).mean);
    expect(learnedSummary(prior, ratings)).toEqual(describeBias(replayBias(prior, ratings), { previous }));
  });

  it('gives the same words as the day-by-day replay', () => {
    for (const lean of [-0.4, -0.1, 0, 0.1, 0.4]) {
      for (const seed of [3, 17, 41, 99]) {
        const ratings = votes(seed, lean);
        expect(learnedSummary(prior, ratings), `lean ${lean} seed ${seed}`).toEqual(quadratic(ratings));
      }
    }
  });

  it('leaves reset votes out', () => {
    const ratings = [r('2026-11-01', -1, { voteCleared: true, corrections: [] })];
    expect(learnedSummary(prior, ratings)).toEqual(describeBias(prior));
  });

  it('does one pass: a year of daily ratings is quick', () => {
    const ratings = Array.from({ length: 365 }, (_, i) => r(iso(i), i % 3 ? -1 : 0));
    const t = performance.now();
    learnedSummary(prior, ratings);
    // The spike's per-day replay took about 35 ms for this on a laptop.
    expect(performance.now() - t).toBeLessThan(15);
  });
});
