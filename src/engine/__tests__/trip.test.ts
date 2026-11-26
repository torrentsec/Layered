// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import { combineAdvice, packingList } from '../packing';
import type { Activity, Hour } from '../types';
import { day } from './fixtures';

const a = (hours: Hour[], activity: Activity = 'walking') => advise({ hours, activity })!;

describe('combineAdvice', () => {
  it('takes the coldest band and every extra', () => {
    const hike = a(day(3, () => ({ feels: 14, uv: 7 })), 'hiking');
    const night = a(day(3, () => ({ feels: 4, precipProb: 40 })), 'night');
    const c = combineAdvice([hike, night])!;
    expect(c.band).toBe('coat');
    expect(c.extras.map((e) => e.id)).toEqual(expect.arrayContaining(['sunscreen', 'sunglasses', 'umbrella', 'gloves']));
    expect(c.minFeels).toBe(4);
    expect(c.maxFeels).toBe(14);
  });
  it('drops the umbrella when a hood is needed anyway', () => {
    const walk = a(day(2, () => ({ feels: 10, precipProb: 50 })));
    const run = a(day(2, () => ({ feels: 10, precipProb: 50 })), 'running');
    const ids = combineAdvice([walk, run])!.extras.map((e) => e.id);
    expect(ids).toContain('hood');
    expect(ids).not.toContain('umbrella');
  });
  it('is null for no activities', () => expect(combineAdvice([])).toBeNull());
});

describe('multi-stop packing', () => {
  it('packs for a warm stop then a cold one with a single outer layer', () => {
    const lisbon = Array(3).fill(a(day(3, () => ({ feels: 23, uv: 6 }))));
    const berlin = Array(4).fill(a(day(3, () => ({ feels: 3, precipProb: 70 }))));
    const list = packingList([...lisbon, ...berlin]);
    const qty = (id: string) => list.find((i) => i.id === id)?.qty;
    expect(qty('tshirt')).toBe(3);
    expect(qty('base')).toBe(4);
    expect(qty('mid')).toBe(2);
    expect(list.filter((i) => i.id === 'outer')).toHaveLength(1);
    expect(list.find((i) => i.id === 'outer')?.label).toMatch(/^Warm coat/);
    expect(list.map((i) => i.id)).toEqual(expect.arrayContaining(['sunscreen', 'umbrella', 'gloves']));
  });
});
