// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import type { Rating } from '../../types';
import { DEFAULT_COMFORT } from '../../comfort';
import { BIAS_PRIOR_VARIANCE } from '../bias';
import { biasPrior, replayBias } from '../personal';
import { certaintyOf, describeBias, describeHistory, labelFlips, leanOf } from '../learned';
import type { BiasState } from '../types';
import { simulate } from './learned-sim';

const state = (mean: number, variance = 0.005, count = 12): BiasState => ({ mean, variance, updated: '2026-11-20', count });
const r = (date: string, rating: -1 | 0 | 1, activity: Rating['activity'] = 'walking'): Rating => ({ date, rating, effective: 8, activity });

describe('leanOf', () => {
  it.each([
    [0, 'average', undefined],
    [0.049, 'average', undefined],
    [0.05, 'cold', 'a little'],
    [0.199, 'cold', 'a little'],
    [0.2, 'cold', 'clearly'],
    [0.4, 'cold', 'a lot'],
    [-0.05, 'warm', 'a little'],
    [-0.2, 'warm', 'clearly'],
    [-0.6, 'warm', 'a lot'],
  ])('%s clo is %s %s', (mean, lean, strength) => {
    expect(leanOf(mean)).toEqual(strength ? { lean, strength } : { lean });
  });

  it('keeps the previous words until the bias is 0.02 clo past the boundary', () => {
    const little = { lean: 'cold', strength: 'a little' } as const;
    expect(leanOf(0.21, little)).toEqual(little);
    expect(leanOf(0.221, little)).toEqual({ lean: 'cold', strength: 'clearly' });
    expect(leanOf(0.035, little)).toEqual(little);
    expect(leanOf(0.029, little)).toEqual({ lean: 'average' });
    expect(leanOf(0.06, { lean: 'average' })).toEqual({ lean: 'average' });
    expect(leanOf(0.071, { lean: 'average' })).toEqual(little);
  });

  it('never holds a lean once the bias crosses to the other side', () => {
    expect(leanOf(-0.06, { lean: 'cold', strength: 'a little' })).toEqual({ lean: 'warm', strength: 'a little' });
  });

  it('treats a non-number as average', () => {
    expect(leanOf(Number.NaN)).toEqual({ lean: 'average' });
  });
});

describe('certaintyOf', () => {
  it('says the settings alone when nothing is rated', () => {
    expect(certaintyOf({ variance: BIAS_PRIOR_VARIANCE, count: 0 })).toBe('settings');
  });

  it.each([
    [0.13 ** 2, 'early'],
    [0.1299 ** 2, 'fair'],
    [0.09 ** 2, 'fair'],
    [0.0899 ** 2, 'sure'],
    [Number.NaN, 'early'],
  ])('variance %s is %s', (variance, want) => {
    expect(certaintyOf({ variance, count: 5 })).toBe(want);
  });
});

describe('describeBias', () => {
  it('words the person and the advice', () => {
    expect(describeBias(state(0.25)).headline).toBe('You feel the cold');
    expect(describeBias(state(0.25), { wording: 'advice' }).headline).toBe('Dressing you warmer');
    expect(describeBias(state(-0.1)).headline).toBe('You run a little warm');
    expect(describeBias(state(-0.5), { wording: 'advice' }).headline).toBe('Dressing you much lighter');
    expect(describeBias(state(0)).headline).toBe('You’re about average');
  });

  it('says how sure, and from how many ratings', () => {
    expect(describeBias(state(0.1, 0.005, 1)).detail).toBe('Sure: from 1 rating.');
    expect(describeBias(state(0.1, 0.012, 6)).detail).toBe('Fairly sure: from 6 ratings.');
    expect(describeBias(state(0.1, 0.03, 2)).detail).toBe('Early days: from 2 ratings.');
    expect(describeBias(biasPrior(DEFAULT_COMFORT, 0)).detail).toBe('From your comfort settings. Rate a few days to fine-tune it.');
  });

  it('reflects comfort settings before any vote', () => {
    // A "feel the cold" profile is a negative °C offset, so it asks for more clo.
    const s = describeBias(biasPrior({ sensitivity: 'cold' }, 0));
    expect(s.lean).toBe('cold');
    expect(s.certainty).toBe('settings');
  });
});

describe('replayed vote histories', () => {
  const prior = biasPrior(DEFAULT_COMFORT, 0);
  const days = (n: number, rating: -1 | 0 | 1, start = 1) =>
    Array.from({ length: n }, (_, i) => r(`2026-10-${String(start + i).padStart(2, '0')}`, rating));

  it('a run of "too cold" votes reads as feeling the cold, and grows surer', () => {
    const early = describeBias(replayBias(prior, days(2, -1)));
    const later = describeBias(replayBias(prior, days(20, -1)));
    expect(early).toMatchObject({ lean: 'cold', certainty: 'early' });
    expect(later).toMatchObject({ lean: 'cold', certainty: 'sure' });
  });

  it('indoor votes take longer to be sure of', () => {
    const outdoor = replayBias(prior, days(5, 0));
    const indoor = replayBias(prior, days(5, 0).map((v) => ({ ...v, activity: 'office' as const })));
    expect(certaintyOf(outdoor)).toBe('fair');
    expect(certaintyOf(indoor)).toBe('early');
  });

  it('describeHistory matches describeBias on the last state when nothing sits on a boundary', () => {
    const states = [prior, replayBias(prior, days(10, -1))];
    expect(describeHistory(states)).toEqual(describeBias(states[1]));
    expect(describeHistory([])).toBeUndefined();
  });
});

describe('evidence: simulated people rating 60 days', () => {
  // Twenty seeded people per true bias; they rate about 70% of days.
  const truths = [-0.3, -0.12, 0, 0.12, 0.3];
  const runs = truths.map((truth) => ({
    truth,
    people: Array.from({ length: 20 }, (_, s) => simulate({ truth, days: 60, seed: (s + 1) * 97 + Math.round(truth * 100) })),
  }));

  it('ends on the right lean for nearly everyone', () => {
    for (const { truth, people } of runs) {
      const want = truth === 0 ? 'average' : truth > 0 ? 'cold' : 'warm';
      const right = people.filter((st) => describeBias(st[st.length - 1]).lean === want).length;
      expect(right, `truth ${truth}`).toBeGreaterThanOrEqual(18);
    }
  });

  it('hysteresis cuts flip-flopping, most of all for average people', () => {
    const flips = (hyst: boolean) => runs.map(({ people }) => people.reduce((n, st) => n + labelFlips(st, hyst), 0) / people.length);
    const with_ = flips(true);
    const without = flips(false);
    with_.forEach((f, i) => expect(f).toBeLessThanOrEqual(without[i]));
    expect(with_[2]).toBeLessThan(1);
    expect(Math.max(...with_)).toBeLessThan(1.5);
  });

  it('words settle: few changes after the first month', () => {
    for (const { people } of runs) {
      const late = people.reduce((n, st) => n + labelFlips(st.slice(30)), 0) / people.length;
      expect(late).toBeLessThan(0.5);
    }
  });

  it('is fairly sure within about four votes and sure within about sixteen', () => {
    const all = runs.flatMap((r) => r.people);
    const votesTo = (c: string) => all.reduce((n, st) => n + (st.find((x) => certaintyOf(x) === c)?.count ?? 99), 0) / all.length;
    expect(votesTo('fair')).toBeLessThanOrEqual(5);
    expect(votesTo('sure')).toBeLessThanOrEqual(16);
  });
});
