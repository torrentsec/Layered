// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/utci.json';
import { saturationVapourPressure, utci, utciCategory, utciPolynomial } from '../utci';
import type { UtciCategory } from '../types';

type Row = [number, number, number, number, number, boolean, string | null];
const rows = fixture.rows as Row[];
const TOL = fixture.meta.tolerance.utci;

const LABEL: Record<string, UtciCategory> = {
  'extreme cold stress': 'extreme-cold',
  'very strong cold stress': 'very-strong-cold',
  'strong cold stress': 'strong-cold',
  'moderate cold stress': 'moderate-cold',
  'slight cold stress': 'slight-cold',
  'no thermal stress': 'none',
  'moderate heat stress': 'moderate-heat',
  'strong heat stress': 'strong-heat',
  'very strong heat stress': 'very-strong-heat',
  'extreme heat stress': 'extreme-heat',
};

const paKpa = (ta: number, rh: number): number => (saturationVapourPressure(ta) * rh) / 1000;

describe('utci against utci.json', () => {
  const inRange = rows.filter((r) => r[5]);
  const outside = rows.filter((r) => !r[5]);

  it('has both kinds of row', () => {
    expect(inRange.length).toBeGreaterThan(1000);
    expect(outside.length).toBeGreaterThan(0);
  });

  it('matches every in-range row within tolerance, with the same category', () => {
    let maxError = 0;
    for (const [ta, tr, v, rh, expected, , label] of inRange) {
      const res = utci(ta, tr, v, rh);
      const where = `ta=${ta} tr=${tr} v=${v} rh=${rh}`;
      expect(Math.abs(res.utci - expected), where).toBeLessThanOrEqual(TOL);
      expect(res.category, where).toBe(LABEL[label as string]);
      expect(res.clamped, where).toBe(false);
      expect(res.outOfRange, where).toBe(false);
      maxError = Math.max(maxError, Math.abs(res.utci - expected));
    }
    console.info(`utci: max fixture error ${maxError.toFixed(4)} °C over ${inRange.length} rows`);
    // Fixture values are rounded to 0.01 °C, so this is the floor.
    expect(maxError).toBeLessThanOrEqual(0.005 + 1e-9);
  });

  it('flags every out-of-range row as clamped or out of range', () => {
    for (const [ta, tr, v, rh] of outside) {
      const res = utci(ta, tr, v, rh);
      expect(res.clamped || res.outOfRange, `ta=${ta} tr=${tr} v=${v} rh=${rh}`).toBe(true);
    }
  });

  it('reproduces the raw polynomial on every row, extrapolated ones included', () => {
    for (const [ta, tr, v, rh, expected] of rows) {
      const raw = utciPolynomial(ta, tr - ta, v, paKpa(ta, rh));
      expect(Math.abs(raw - expected), `ta=${ta} tr=${tr} v=${v} rh=${rh}`).toBeLessThanOrEqual(TOL);
    }
  });
});

describe('utci clamps', () => {
  it('raises calm wind to 0.5 m/s', () => {
    const calm = utci(10, 10, 0, 50);
    expect(calm.clamped).toBe(true);
    expect(calm.utci).toBe(utci(10, 10, 0.5, 50).utci);
  });

  it('caps wind at 17 m/s', () => {
    const gale = utci(0, 0, 25, 50);
    expect(gale.clamped).toBe(true);
    expect(gale.utci).toBe(utci(0, 0, 17, 50).utci);
  });

  it('limits Tmrt − ta to [−30, 70]', () => {
    expect(utci(10, -40, 2, 50)).toEqual({ ...utci(10, -20, 2, 50), clamped: true });
    expect(utci(10, 100, 2, 50)).toEqual({ ...utci(10, 80, 2, 50), clamped: true });
  });

  it('limits ta to [−50, 50] and rh to [0, 100]', () => {
    expect(utci(-60, -60, 2, 50).clamped).toBe(true);
    expect(utci(10, 10, 2, 120)).toEqual({ ...utci(10, 10, 2, 100), clamped: true });
  });

  it('accepts the edges of the range without flagging them', () => {
    expect(utci(10, -20, 0.5, 50).clamped).toBe(false);
    expect(utci(10, 80, 17, 50).clamped).toBe(false);
  });

  it('gives no number above 5 kPa and calls it extreme heat', () => {
    expect(paKpa(40, 95)).toBeGreaterThan(5);
    const res = utci(40, 40, 1, 95);
    expect(res.outOfRange).toBe(true);
    expect(res.category).toBe('extreme-heat');
    expect(Number.isNaN(res.utci)).toBe(true);
  });

  it('keeps a warm humid hour below 5 kPa in range', () => {
    expect(paKpa(30, 95)).toBeLessThan(5);
    expect(utci(30, 30, 1, 95).outOfRange).toBe(false);
  });

  it('reads a sunny calm day warmer than a grey windy one at the same temperature', () => {
    expect(utci(10, 30, 1, 60).utci).toBeGreaterThan(utci(10, 8, 8, 60).utci + 5);
  });
});

describe('utciCategory', () => {
  it.each<[number, UtciCategory]>([
    [-50, 'extreme-cold'], [-40, 'extreme-cold'], [-39.99, 'very-strong-cold'],
    [-27, 'very-strong-cold'], [-26.99, 'strong-cold'],
    [-13, 'strong-cold'], [-12.99, 'moderate-cold'],
    [0, 'moderate-cold'], [0.01, 'slight-cold'],
    [9, 'slight-cold'], [9.01, 'none'],
    [26, 'none'], [26.01, 'moderate-heat'],
    [32, 'moderate-heat'], [32.01, 'strong-heat'],
    [38, 'strong-heat'], [38.01, 'very-strong-heat'],
    [46, 'very-strong-heat'], [46.01, 'extreme-heat'], [60, 'extreme-heat'],
  ])('%s °C is %s (upper edge inclusive)', (value, category) => {
    expect(utciCategory(value)).toBe(category);
  });
});

describe('utci performance', () => {
  it('computes 384 hours quickly (reported, not gated)', () => {
    const run = () => {
      let s = 0;
      for (let h = 0; h < 384; h++) s += utci(-5 + (h % 30), h % 50, 0.5 + (h % 12), 30 + (h % 60)).utci;
      return s;
    };
    const times: number[] = [];
    for (let i = 0; i < 11; i++) {
      const start = performance.now();
      run();
      times.push(performance.now() - start);
    }
    const first = times[0];
    const median = [...times].sort((a, b) => a - b)[5];
    console.info(`utci: 384 hours in ${first.toFixed(3)} ms first timed run, ${median.toFixed(3)} ms median`);
    expect(median).toBeGreaterThanOrEqual(0);
  });
});
