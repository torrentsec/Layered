// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import {
  BIAS_LIMIT,
  BIAS_PRIOR_VARIANCE,
  BIAS_PROCESS_NOISE,
  BIAS_VOTE_NOISE,
  CLO_PER_CELSIUS,
  migrateOffsetToClo,
  updateBias,
} from '../bias';
import type { BiasState } from '../types';
import { SENSITIVITY_OFFSET } from '../../comfort';

const fresh = (): BiasState => migrateOffsetToClo(0);
type Vote = -1 | 0 | 1;

function replay(votes: Vote[], dates: string[], start = fresh()): BiasState {
  return votes.reduce((s, v, i) => updateBias(s, v, dates[i]), start);
}

// Small deterministic generator so the property test is repeatable.
function lcg(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

describe('migrateOffsetToClo', () => {
  it('uses 0.07 clo per °C, feeling cold means more clo', () => {
    expect(CLO_PER_CELSIUS).toBe(0.07);
    expect(migrateOffsetToClo(SENSITIVITY_OFFSET.cold).mean).toBeCloseTo(0.14, 10);
    expect(migrateOffsetToClo(SENSITIVITY_OFFSET.warm).mean).toBeCloseTo(-0.14, 10);
    expect(migrateOffsetToClo(-3.5).mean).toBeCloseTo(0.245, 10);
  });

  it('starts at zero for an average profile, with no negative zero', () => {
    expect(Object.is(migrateOffsetToClo(0).mean, 0)).toBe(true);
  });

  it('starts from the prior variance with no votes counted', () => {
    expect(migrateOffsetToClo(2)).toEqual({ mean: -0.14, variance: BIAS_PRIOR_VARIANCE, updated: '', count: 0 });
  });

  it('clamps large offsets and ignores nonsense', () => {
    expect(migrateOffsetToClo(-20).mean).toBe(BIAS_LIMIT);
    expect(migrateOffsetToClo(20).mean).toBe(-BIAS_LIMIT);
    expect(migrateOffsetToClo(Number.NaN).mean).toBe(0);
  });
});

describe('updateBias', () => {
  it('moves about 0.06 clo on the first vote, less than half the step', () => {
    const cold = updateBias(fresh(), -1, '2026-11-01');
    expect(Math.abs(cold.mean - 0.06)).toBeLessThanOrEqual(0.005);
    expect(updateBias(fresh(), 1, '2026-11-01').mean).toBeCloseTo(-cold.mean, 12);
  });

  it('gives the documented first gain of about 0.41', () => {
    const s = updateBias(fresh(), 0, '2026-11-01');
    const k = 1 - s.variance / BIAS_PRIOR_VARIANCE;
    expect(k).toBeCloseTo(BIAS_PRIOR_VARIANCE / (BIAS_PRIOR_VARIANCE + BIAS_VOTE_NOISE), 12);
    expect(k).toBeCloseTo(0.41, 2);
  });

  it('treats "just right" as an observation: variance shrinks, mean stays', () => {
    const start = migrateOffsetToClo(-2);
    const s = updateBias(start, 0, '2026-11-01');
    expect(s.mean).toBe(start.mean);
    expect(s.variance).toBeLessThan(start.variance);
    expect(s.count).toBe(1);
  });

  it('converges under ten identical votes on different days and never passes the clamp', () => {
    let s = fresh();
    const steps: number[] = [];
    for (let d = 1; d <= 10; d++) {
      const before = s.mean;
      s = updateBias(s, -1, `2026-11-${String(d).padStart(2, '0')}`);
      steps.push(s.mean - before);
    }
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1]);
    // Gain near 0.1 by the tenth vote (0.08 in the spike, before daily drift is added).
    expect(steps[9]).toBeLessThan(0.15 * 0.11);
    expect(s.mean).toBeGreaterThan(0.2);
    expect(s.mean).toBeLessThanOrEqual(BIAS_LIMIT);
  });

  it('holds at the clamp after many daily votes the same way', () => {
    let s = fresh();
    for (let i = 0; i < 400; i++) {
      s = updateBias(s, 1, new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
      expect(s.mean).toBeGreaterThanOrEqual(-BIAS_LIMIT);
    }
    expect(s.mean).toBe(-BIAS_LIMIT);
  });

  it('moves at most one step however many times it is told the same thing in a day', () => {
    let s = fresh();
    for (let i = 0; i < 50; i++) s = updateBias(s, -1, '2026-11-01');
    expect(s.mean).toBeGreaterThan(0.14);
    expect(s.mean).toBeLessThanOrEqual(0.15);
  });

  it('lets one odd vote barely move a well-established bias', () => {
    let s = fresh();
    for (let d = 1; d <= 10; d++) s = updateBias(s, -1, `2026-11-${String(d).padStart(2, '0')}`);
    const odd = updateBias(s, 1, '2026-11-11');
    expect(s.mean - odd.mean).toBeGreaterThan(0);
    expect(s.mean - odd.mean).toBeLessThan(0.02);
  });

  it('adds process noise per day between votes', () => {
    const s = updateBias(fresh(), 0, '2026-11-01');
    const sameDay = updateBias(s, 0, '2026-11-01');
    const monthLater = updateBias(s, 0, '2026-12-01');
    const p = s.variance + 30 * BIAS_PROCESS_NOISE;
    expect(monthLater.variance).toBeCloseTo((p * BIAS_VOTE_NOISE) / (p + BIAS_VOTE_NOISE), 12);
    expect(monthLater.variance).toBeGreaterThan(sameDay.variance);
  });

  it('caps the predicted variance at the prior after a long break', () => {
    const s = updateBias(fresh(), 0, '2024-01-01');
    const back = updateBias(s, -1, '2026-11-01');
    expect(back.mean).toBeCloseTo(updateBias(fresh(), -1, '2026-11-01').mean, 12);
  });

  it('down-weights a mostly indoor day by doubling the vote noise', () => {
    const outdoors = updateBias(fresh(), -1, '2026-11-01');
    const indoors = updateBias(fresh(), -1, '2026-11-01', { mostlyIndoors: true });
    const k = BIAS_PRIOR_VARIANCE / (BIAS_PRIOR_VARIANCE + 2 * BIAS_VOTE_NOISE);
    expect(indoors.mean).toBeCloseTo(k * 0.15, 12);
    expect(indoors.mean).toBeLessThan(outdoors.mean);
  });

  it('learns from what was worn when the target is known', () => {
    // Wore 0.3 clo more than advised and was still cold: needs about 0.45 clo more.
    const s = updateBias(fresh(), -1, '2026-11-01', { wornIcl: 1.3, modelIcl: 1.0 });
    const k = BIAS_PRIOR_VARIANCE / (BIAS_PRIOR_VARIANCE + BIAS_VOTE_NOISE);
    expect(s.mean).toBeCloseTo(k * 0.45, 12);
    const partial = updateBias(fresh(), -1, '2026-11-01', { wornIcl: 1.3 });
    expect(partial.mean).toBeCloseTo(updateBias(fresh(), -1, '2026-11-01').mean, 12);
  });

  it('is order-independent within 0.02 clo for votes on the same day', () => {
    const rand = lcg(42);
    for (let trial = 0; trial < 200; trial++) {
      let start = fresh();
      for (let d = 1; d <= Math.floor(rand() * 4); d++) {
        start = updateBias(start, (Math.floor(rand() * 3) - 1) as Vote, `2026-10-0${d}`);
      }
      const n = 2 + Math.floor(rand() * 5);
      const votes = Array.from({ length: n }, () => (Math.floor(rand() * 3) - 1) as Vote);
      const shuffled = [...votes].sort(() => rand() - 0.5);
      const dates = votes.map(() => '2026-11-01');
      const a = replay(votes, dates, start);
      const b = replay(shuffled, dates, start);
      expect(Math.abs(a.mean - b.mean), `${votes} vs ${shuffled}`).toBeLessThanOrEqual(0.02);
      expect(a.variance).toBeCloseTo(b.variance, 12);
    }
  });

  it('pulls back on a same-day "just right" after a cold vote, as the reverse order would', () => {
    const coldThenOk = replay([-1, 0], ['2026-11-01', '2026-11-01']);
    const okThenCold = replay([0, -1], ['2026-11-01', '2026-11-01']);
    expect(coldThenOk.mean).toBeCloseTo(okThenCold.mean, 12);
  });

  it('applies a late replayed vote without drift and keeps the latest date', () => {
    const s = updateBias(fresh(), 0, '2026-11-10');
    const late = updateBias(s, -1, '2026-11-02');
    expect(late.updated).toBe('2026-11-10');
    expect(late.mean).toBeGreaterThan(s.mean);
    expect(late.variance).toBeLessThan(s.variance);
    expect(late.count).toBe(2);
  });

  it('is deterministic and does not mutate its input', () => {
    const s = migrateOffsetToClo(-2);
    const copy = { ...s };
    const a = updateBias(s, -1, '2026-11-01', { wornIcl: 1.1, modelIcl: 1.0 });
    const b = updateBias(s, -1, '2026-11-01', { wornIcl: 1.1, modelIcl: 1.0 });
    expect(a).toEqual(b);
    expect(s).toEqual(copy);
  });
});
