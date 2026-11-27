// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/ireq.json';
import { DLE_CEILING_H, dle, ireq, lightestIclFor, minWalkSpeed } from '../ireq';
import type { IreqParams, IreqResult } from '../types';

type Dle = number | string | null;
interface Case {
  label?: string;
  in: { ta: number; tr: number; va: number; rh: number; M: number; W: number; clo: number; p: number; walk: number };
  out: {
    ireqMin: number | null;
    ireqNeutral: number | null;
    iclMin: number | null;
    iclNeutral: number | null;
    dleMin: Dle;
    dleNeutral: Dle;
  };
}

const TOL = fixture.meta.tolerance;
const cases = fixture.cases as Case[];
const sweep = fixture.dleSweep as Case[];
const extrapolated = fixture.extrapolated as Case[];

function params(c: Case): IreqParams {
  const { ta, tr, va, rh, M, W, clo, p, walk } = c.in;
  return { ta, tr, va, rh, m: M, w: W, p, walk, icl: clo };
}

function describeCase(c: Case): string {
  return c.label ?? JSON.stringify(c.in);
}

const CLO_KEYS = ['ireqMin', 'ireqNeutral', 'iclMin', 'iclNeutral'] as const;

/** Largest deviation seen in each unit over the fixture checks, for the report. */
const maxError = { clo: 0, dle: 0 };

function expectClo(actual: number, expected: number, tol: number, where: string): void {
  const err = Math.abs(actual - expected);
  maxError.clo = Math.max(maxError.clo, err);
  expect(err, `${where}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
}

function expectDle(actual: number, expected: Dle, where: string): void {
  if (expected === 'more than 8') {
    expect(actual, where).toBe(Infinity);
    return;
  }
  expect(typeof expected, where).toBe('number');
  const err = Math.abs(actual - (expected as number));
  maxError.dle = Math.max(maxError.dle, err);
  expect(err, `${where}: ${actual} vs ${expected}`).toBeLessThanOrEqual(TOL.dle);
}

function checkCase(c: Case, r: IreqResult): void {
  const where = describeCase(c);
  for (const key of CLO_KEYS) {
    const expected = c.out[key];
    if (expected === null) {
      // The reference drops a criterion when its resultant or basic value is negative.
      const pair = key.endsWith('Min') ? [r.ireqMin, r.iclMin] : [r.ireqNeutral, r.iclNeutral];
      expect(Math.min(...pair), `${where} ${key}`).toBeLessThan(0);
      expect(r.extended, where).toBe(true);
    } else {
      expectClo(r[key], expected, key.startsWith('ireq') ? TOL.ireq : TOL.icl, `${where} ${key}`);
    }
  }
  if (c.out.dleMin !== null) expectDle(r.dleMin, c.out.dleMin, `${where} dleMin`);
  if (c.out.dleNeutral !== null) expectDle(r.dleNeutral, c.out.dleNeutral, `${where} dleNeutral`);
}

describe('ireq against pythermalcomfort fixtures', () => {
  it.each(cases.map((c) => [describeCase(c), c] as const))('case %s', (_, c) => {
    const r = ireq(params(c));
    checkCase(c, r);
    const physical = Object.values(c.out).every((v) => v !== null);
    if (physical) expect(r.extended).toBe(false);
  });

  it('dleSweep cases match and DLE rises with clo', () => {
    for (const c of sweep) checkCase(c, ireq(params(c)));
    const groups = new Map<string, Case[]>();
    for (const c of sweep) {
      const key = `${c.in.ta}/${c.in.va}/${c.in.M}`;
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    for (const group of groups.values()) {
      const sorted = [...group].sort((a, b) => a.in.clo - b.in.clo);
      for (let i = 1; i < sorted.length; i++) {
        const prev = dle({ ...params(sorted[i - 1]), icl: sorted[i - 1].in.clo });
        const next = dle({ ...params(sorted[i]), icl: sorted[i].in.clo });
        expect(next.min).toBeGreaterThanOrEqual(prev.min);
        expect(next.neutral).toBeGreaterThanOrEqual(prev.neutral);
      }
    }
  });

  it('extrapolated cases above 10 °C match and are flagged extended', () => {
    for (const c of extrapolated) {
      const r = ireq(params(c));
      checkCase(c, r);
      expect(r.extended, describeCase(c)).toBe(true);
    }
  });

  it('dle agrees with ireq', () => {
    for (const c of cases) {
      const r = ireq(params(c));
      const d = dle({ ...params(c), icl: c.in.clo });
      expect(d.min).toBe(r.dleMin);
      expect(d.neutral).toBe(r.dleNeutral);
    }
  });

  it('stays within tolerance across the whole fixture set', () => {
    expect(maxError.clo).toBeLessThanOrEqual(Math.max(TOL.ireq, TOL.icl));
    expect(maxError.dle).toBeLessThanOrEqual(TOL.dle);
  });

  it('averages under 2 ms per call over the fixture set', () => {
    const all = [...cases, ...sweep, ...extrapolated].map(params);
    for (const p of all) ireq(p);
    const rounds = 5;
    const start = performance.now();
    for (let r = 0; r < rounds; r++) for (const p of all) ireq(p);
    const perCall = (performance.now() - start) / (rounds * all.length);
    expect(perCall).toBeLessThan(2);
  });
});

const BASE: IreqParams = { ta: 0, tr: 0, va: 3, rh: 75, m: 135, walk: 0.401 };

describe('ireq limits and edge cases', () => {
  it('flags temperatures above 10 °C but not at 10 °C', () => {
    expect(ireq({ ...BASE, ta: 10, tr: 10 }).extended).toBe(false);
    expect(ireq({ ...BASE, ta: 10.1, tr: 10.1 }).extended).toBe(true);
  });

  it('flags walking below the lower bound for the metabolic rate', () => {
    expect(minWalkSpeed(135)).toBeCloseTo(0.4004, 6);
    expect(ireq({ ...BASE, walk: 0.401 }).extended).toBe(false);
    expect(ireq({ ...BASE, walk: 0.39 }).extended).toBe(true);
  });

  it('caps walking speed at 1.2 m/s', () => {
    const fast = ireq({ ...BASE, m: 300, walk: 2 });
    const capped = ireq({ ...BASE, m: 300, walk: 1.2 });
    expect(fast.extended).toBe(true);
    expect(fast.iclNeutral).toBe(capped.iclNeutral);
  });

  it('clamps M above 400 W/m² and flags it', () => {
    const at = ireq({ ...BASE, m: 400, walk: 1.2 });
    const above = ireq({ ...BASE, m: 520, walk: 1.2 });
    expect(at.extended).toBe(false);
    expect(above.extended).toBe(true);
    expect(above.ireqNeutral).toBe(at.ireqNeutral);
    expect(above.iclMin).toBe(at.iclMin);
  });

  it('flags M below 58 W/m² and air speed under 0.4 m/s', () => {
    expect(ireq({ ...BASE, m: 50, walk: 0 }).extended).toBe(true);
    expect(ireq({ ...BASE, va: 0.2 }).extended).toBe(true);
  });

  it('clamps high wind at 18 m/s and stays finite', () => {
    const gale = ireq({ ...BASE, va: 30 });
    const limit = ireq({ ...BASE, va: 18 });
    expect(gale.extended).toBe(true);
    expect(limit.extended).toBe(false);
    expect(gale.iclNeutral).toBe(limit.iclNeutral);
    expect(Number.isFinite(gale.iclNeutral)).toBe(true);
    expect(limit.iclNeutral).toBeGreaterThan(ireq({ ...BASE, va: 8 }).iclNeutral);
  });

  it('solves very cold conditions with short, finite DLE', () => {
    const r = ireq({ ta: -50, tr: -50, va: 10, rh: 50, m: 70, walk: 0.063, icl: 3 });
    expect(r.extended).toBe(false);
    expect(r.iclNeutral).toBeGreaterThan(r.iclMin);
    expect(r.iclMin).toBeGreaterThan(5);
    expect(r.dleNeutral).toBeGreaterThan(0);
    expect(r.dleNeutral).toBeLessThan(1);
  });

  it('extends smoothly to 20 °C', () => {
    let prev = ireq({ ...BASE, ta: 10, tr: 10, va: 1 }).iclNeutral;
    for (let ta = 11; ta <= 20; ta += 1) {
      const r = ireq({ ...BASE, ta, tr: ta, va: 1 });
      expect(r.iclNeutral).toBeLessThan(prev);
      expect(prev - r.iclNeutral).toBeLessThan(0.15);
      prev = r.iclNeutral;
    }
  });

  it('reports Infinity beyond the 8 h ceiling, finite just under it', () => {
    const r = ireq({ ...BASE, icl: 4 });
    expect(r.dleMin).toBe(Infinity);
    expect(r.dleNeutral).toBe(Infinity);
    const values: number[] = [];
    for (let clo = 1.5; clo <= 2.4; clo += 0.01) values.push(dle({ ...BASE, icl: clo }).neutral);
    const finite = values.filter(Number.isFinite);
    expect(finite.length).toBeGreaterThan(0);
    expect(Math.max(...finite)).toBeLessThanOrEqual(DLE_CEILING_H);
  });

  it('requirement falls with metabolic rate and rises with wind', () => {
    const ms = [70, 115, 135, 200, 300];
    for (let i = 1; i < ms.length; i++) {
      const a = ireq({ ...BASE, m: ms[i - 1], walk: Math.max(minWalkSpeed(ms[i - 1]), 0) + 0.001 });
      const b = ireq({ ...BASE, m: ms[i], walk: minWalkSpeed(ms[i]) + 0.001 });
      expect(b.ireqNeutral).toBeLessThan(a.ireqNeutral);
    }
    const winds = [0.4, 1, 3, 8, 18];
    for (let i = 1; i < winds.length; i++) {
      expect(ireq({ ...BASE, va: winds[i] }).iclNeutral).toBeGreaterThan(ireq({ ...BASE, va: winds[i - 1] }).iclNeutral);
    }
  });

  it('a tighter shell (lower permeability) needs less basic insulation', () => {
    expect(ireq({ ...BASE, p: 8 }).iclNeutral).toBeLessThan(ireq({ ...BASE, p: 50 }).iclNeutral);
    expect(ireq({ ...BASE, p: 1000 }).iclNeutral).toBeGreaterThan(ireq({ ...BASE, p: 50 }).iclNeutral);
  });
});

describe('lightestIclFor', () => {
  const trip: Omit<IreqParams, 'icl'> = BASE;
  const steady = ireq(trip);

  it('covers the exposure with the neutral criterion', () => {
    const icl = lightestIclFor(trip, 0.5);
    expect(dle({ ...trip, icl }).neutral).toBeGreaterThanOrEqual(0.5);
    expect(dle({ ...trip, icl: icl - 0.02 }).neutral).toBeLessThan(0.5);
    // The spike's worked example: about 1.2 clo for a 30-minute walk at 0 °C, 3 m/s.
    expect(icl).toBeGreaterThan(1.1);
    expect(icl).toBeLessThan(1.35);
  });

  it('rises with exposure and approaches the steady-state neutral level', () => {
    const exposures = [0.25, 0.5, 1, 2, 4, 8, 24];
    const values = exposures.map((h) => lightestIclFor(trip, h));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    expect(values.at(-1)!).toBeLessThanOrEqual(steady.iclNeutral + 0.01);
    expect(values.at(-1)!).toBeGreaterThan(steady.iclNeutral - 0.15);
  });

  it('is floored by the minimal criterion for the same exposure', () => {
    for (const h of [0.25, 1, 4, 12]) {
      const icl = lightestIclFor(trip, h);
      expect(dle({ ...trip, icl }).min).toBeGreaterThanOrEqual(h);
    }
    expect(lightestIclFor(trip, 24)).toBeGreaterThanOrEqual(steady.iclMin);
  });

  it('falls back to the minimal criterion when 3 clo cannot keep the body neutral', () => {
    const cold = { ta: -20, tr: -20, va: 3, rh: 50, m: 135, walk: 0.401 };
    const icl = lightestIclFor(cold, 1.5);
    expect(dle({ ...cold, icl: 3 }).neutral).toBeLessThan(1.5);
    expect(dle({ ...cold, icl }).min).toBeGreaterThanOrEqual(1.5);
    expect(dle({ ...cold, icl: icl - 0.02 }).min).toBeLessThan(1.5);
    expect(icl).toBeLessThanOrEqual(3);
  });

  it('returns the steady-state Icl_min when even 3 clo is not enough', () => {
    const standing = { ta: -30, tr: -30, va: 8, rh: 50, m: 70, walk: 0.063 };
    expect(dle({ ...standing, icl: 3 }).min).toBeLessThan(4);
    expect(lightestIclFor(standing, 4)).toBeCloseTo(ireq(standing).iclMin, 6);
  });

  it('never goes below zero or above the search floor in mild weather', () => {
    const mild = { ta: 18, tr: 18, va: 0.4, rh: 50, m: 200, walk: 0.739 };
    const icl = lightestIclFor(mild, 3);
    expect(icl).toBeGreaterThanOrEqual(0);
    expect(icl).toBeLessThanOrEqual(0.3);
    expect(lightestIclFor({ ...mild, ta: 24, tr: 24 }, 3)).toBe(0);
  });

  it('treats a zero or negative exposure as the shortest trip', () => {
    expect(lightestIclFor(trip, 0)).toBe(lightestIclFor(trip, -1));
    expect(lightestIclFor(trip, 0)).toBeLessThanOrEqual(0.3);
  });

  it('averages under 2 ms per call', () => {
    const start = performance.now();
    const n = 200;
    for (let i = 0; i < n; i++) lightestIclFor({ ...trip, ta: -10 + (i % 20) }, 0.25 + (i % 8) * 0.5);
    expect((performance.now() - start) / n).toBeLessThan(2);
  });
});
