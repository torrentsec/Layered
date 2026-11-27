// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { ACTIVITIES, EFFORTS, scalesWithEffort } from '../../activity';
import type { Activity, Effort } from '../../types';
import { METABOLIC, METABOLIC_EFFORT, metabolicRate, minWalk, M_MAX, WALK_MAX } from '../metabolic';

// thermal-model.md §5.2, rounded there to 5 W/m² and 0.1 m/s.
const SPIKE: Record<Activity, { m: number; walk: number }> = {
  walking: { m: 155, walk: 1.2 },
  standing: { m: 70, walk: 0 },
  transport: { m: 100, walk: 0.6 },
  office: { m: 100, walk: 0.6 },
  indoors: { m: 135, walk: 1.1 },
  night: { m: 95, walk: 0.4 },
  cycling: { m: 305, walk: 0 },
  running: { m: 440, walk: 1.2 },
  hiking: { m: 270, walk: 1.2 },
};

const SPIKE_EFFORT: Record<'running' | 'cycling' | 'hiking', Record<Effort, number>> = {
  running: { easy: 375, steady: 440, hard: 495 },
  cycling: { easy: 180, steady: 305, hard: 450 },
  hiking: { easy: 240, steady: 270, hard: 315 },
};

const all = ACTIVITIES.flatMap((a) => EFFORTS.map((e) => [a, e] as const));

describe('metabolic table', () => {
  it('covers every activity', () => {
    for (const a of ACTIVITIES) expect(() => metabolicRate(a), a).not.toThrow();
    expect(new Set([...Object.keys(METABOLIC), ...Object.keys(METABOLIC_EFFORT)])).toEqual(new Set(ACTIVITIES));
  });

  it('converts Compendium METs at 45 W/m²', () => {
    expect(METABOLIC.walking.m).toBeCloseTo(3.5 * 45, 9);
    expect(METABOLIC.indoors.m).toBeCloseTo(3.0 * 45, 9);
    expect(METABOLIC_EFFORT.cycling.steady.m).toBeCloseTo(6.8 * 45, 9);
    expect(METABOLIC.standing.m).toBeCloseTo(1.2 * 58.15, 9);
  });

  it.each(ACTIVITIES)('%s matches the spike table', (a) => {
    const r = scalesWithEffort(a) ? METABOLIC_EFFORT[a].steady : METABOLIC[a];
    expect(Math.abs(r.m - SPIKE[a].m)).toBeLessThanOrEqual(3);
    expect(Math.abs(r.walk - SPIKE[a].walk)).toBeLessThanOrEqual(0.15);
    expect(r.source.length).toBeGreaterThan(0);
  });

  it('scales sport with effort as the spike table says', () => {
    for (const [a, row] of Object.entries(SPIKE_EFFORT) as [keyof typeof SPIKE_EFFORT, Record<Effort, number>][]) {
      for (const e of EFFORTS) expect(Math.abs(METABOLIC_EFFORT[a][e].m - row[e]), `${a} ${e}`).toBeLessThanOrEqual(3);
      expect(METABOLIC_EFFORT[a].easy.m).toBeLessThan(METABOLIC_EFFORT[a].steady.m);
      expect(METABOLIC_EFFORT[a].steady.m).toBeLessThan(METABOLIC_EFFORT[a].hard.m);
    }
  });

  it('ignores effort for everyday activities and defaults to steady', () => {
    for (const a of ACTIVITIES.filter((x) => !scalesWithEffort(x))) {
      expect(metabolicRate(a, 'hard'), a).toEqual(metabolicRate(a, 'easy'));
    }
    expect(metabolicRate('running')).toEqual(metabolicRate('running', 'steady'));
  });
});

describe('ISO 11079 limits', () => {
  it.each(all)('%s %s stays in 58..400 W/m² and in the walking-speed bounds', (a, e) => {
    const r = metabolicRate(a, e);
    expect(r.m).toBeGreaterThanOrEqual(58);
    expect(r.m).toBeLessThanOrEqual(M_MAX);
    expect(r.walk).toBeGreaterThanOrEqual(minWalk(r.m));
    expect(r.walk).toBeGreaterThanOrEqual(Math.min(0.0052 * (r.m - 58), WALK_MAX) - 1e-12);
    expect(r.walk).toBeLessThanOrEqual(WALK_MAX);
  });

  it('clamps running above 400 W/m² and says so', () => {
    expect(metabolicRate('running', 'steady')).toMatchObject({ m: 400, clampedM: true });
    expect(metabolicRate('running', 'hard')).toMatchObject({ m: 400, clampedM: true });
    expect(metabolicRate('cycling', 'hard')).toMatchObject({ m: 400, clampedM: true });
    expect(metabolicRate('running', 'easy').m).toBeCloseTo(8.3 * 45, 9);
    expect(metabolicRate('running', 'easy').clampedM).toBe(false);
    for (const a of ['walking', 'standing', 'office', 'indoors', 'night', 'transport'] as Activity[]) {
      expect(metabolicRate(a).clampedM, a).toBe(false);
    }
  });

  it('raises standing to the lower walking bound', () => {
    expect(metabolicRate('standing').walk).toBeCloseTo(0.0052 * (1.2 * 58.15 - 58), 9);
  });

  it('caps a 4.8 km/h walk at 1.2 m/s', () => {
    expect(METABOLIC.walking.walk).toBeGreaterThan(1.2);
    expect(metabolicRate('walking').walk).toBe(1.2);
  });
});

describe('cycling', () => {
  it.each(EFFORTS)('%s does about a fifth of M as work and rides faster with effort', (e) => {
    const r = metabolicRate('cycling', e);
    expect(r.w).toBeCloseTo(0.2 * r.m, 9);
    expect(r.ride).toBeGreaterThan(0);
  });

  it('rides at 4, 5 and 6.5 m/s', () => {
    expect(EFFORTS.map((e) => metabolicRate('cycling', e).ride)).toEqual([4, 5, 6.5]);
  });

  it('does no external work or riding on foot', () => {
    for (const [a, e] of all.filter(([a]) => a !== 'cycling')) {
      expect(metabolicRate(a, e), `${a} ${e}`).toMatchObject({ w: 0, ride: 0 });
    }
  });
});
