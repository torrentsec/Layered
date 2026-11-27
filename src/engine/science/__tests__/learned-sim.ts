// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Rating } from '../../types';
import { biasPrior, replayBias } from '../personal';
import { DEFAULT_COMFORT } from '../../comfort';
import type { BiasState } from '../types';

/** Small seeded generator, so every run of the evidence sees the same people. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
}

const iso = (day: number) => new Date(Date.UTC(2026, 9, 1) + day * 86_400_000).toISOString().slice(0, 10);

export interface SimOpts {
  /** The clo this person really needs on top of the model. */
  truth: number;
  days: number;
  seed: number;
  /** Day-to-day noise in what feels right, clo. */
  noise?: number;
  /** Share of days the person rates at all. */
  rateShare?: number;
}

/**
 * A person who rates days: the advice carries today's bias, and they vote
 * "too cold" or "too warm" when what they needed differs by more than a step.
 * Returns the bias state at the end of each day, rebuilt by replaying every
 * stored vote as the app does.
 */
export function simulate({ truth, days, seed, noise = 0.15, rateShare = 0.7 }: SimOpts): BiasState[] {
  const r = rng(seed);
  const prior = biasPrior(DEFAULT_COMFORT, 0);
  const ratings: Rating[] = [];
  const states: BiasState[] = [];
  let state = prior;
  for (let d = 0; d < days; d++) {
    if (r() < rateShare) {
      const e = truth - state.mean + noise * gauss(r);
      const rating = e > 0.1 ? -1 : e < -0.1 ? 1 : 0;
      ratings.push({ date: iso(d), rating, effective: 8, activity: 'walking' });
      state = replayBias(prior, ratings);
    }
    states.push(state);
  }
  return states;
}
