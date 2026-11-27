// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { advise } from '../advise';
import type { Activity, ExtraId, Hour } from '../types';
import { day } from './fixtures';

const ids = (hours: Hour[], activity: Activity = 'walking') => advise({ hours, activity })!.extras.map((e) => e.id);
const has = (hours: Hour[], id: ExtraId, activity: Activity = 'walking') => ids(hours, activity).includes(id);

describe('rain', () => {
  it('umbrella from 30%', () => {
    expect(has(day(2, () => ({ precipProb: 29 })), 'umbrella')).toBe(false);
    expect(has(day(2, () => ({ precipProb: 30 })), 'umbrella')).toBe(true);
  });
  it('waterproof from 60%', () => {
    expect(has(day(2, () => ({ precipProb: 59 })), 'waterproof')).toBe(false);
    expect(has(day(2, () => ({ precipProb: 60 })), 'waterproof')).toBe(true);
  });
  it('waterproof from 1 mm in total, even at low probability', () => {
    expect(has(day(2, () => ({ precipProb: 10, precip: 0.5 })), 'waterproof')).toBe(true);
    expect(has(day(2, () => ({ precipProb: 10, precip: 0.4 })), 'waterproof')).toBe(false);
  });
  it('hooded waterproof instead of umbrella above 40 km/h gusts', () => {
    const h = day(2, () => ({ precipProb: 70, gusts: 41 }));
    expect(has(h, 'hood')).toBe(true);
    expect(has(h, 'umbrella')).toBe(false);
    expect(has(h, 'waterproof')).toBe(false);
    expect(has(day(2, () => ({ precipProb: 70, gusts: 40 })), 'umbrella')).toBe(true);
  });
  it('no umbrella for cyclists or runners', () => {
    expect(has(day(2, () => ({ precipProb: 40 })), 'hood', 'cycling')).toBe(true);
    expect(has(day(2, () => ({ precipProb: 40 })), 'umbrella', 'running')).toBe(false);
  });
});

describe('cold', () => {
  const at = (feels: number, wind = 10) => day(2, () => ({ feels, wind }));
  it('gloves below 5°', () => {
    expect(has(at(5), 'gloves')).toBe(false);
    expect(has(at(4.9), 'gloves')).toBe(true);
  });
  it('hat below 3°', () => {
    expect(has(at(3), 'hat')).toBe(false);
    expect(has(at(2.9), 'hat')).toBe(true);
  });
  it('hat below 8° when wind is over 25 km/h', () => {
    expect(has(at(7.9, 26), 'hat')).toBe(true);
    expect(has(at(7.9, 25), 'hat')).toBe(false);
    expect(has(at(8, 30), 'hat')).toBe(false);
  });
  it('scarf below 0°', () => {
    expect(has(at(0), 'scarf')).toBe(false);
    expect(has(at(-0.1), 'scarf')).toBe(true);
  });
  it('uses the effective temperature, so activity matters', () => {
    expect(has(at(6), 'gloves', 'walking')).toBe(false);
    expect(has(at(6), 'gloves', 'cycling')).toBe(true);
  });
  it('boots for snow', () => {
    expect(has(day(2, (i) => ({ snow: i ? 0.4 : 0 })), 'boots')).toBe(true);
    expect(has(day(2, () => ({ code: 73 })), 'boots')).toBe(true);
    expect(has(day(2), 'boots')).toBe(false);
  });
});

describe('sun, wind, dark, swing', () => {
  it('sunglasses from UV 3, sunscreen from UV 6', () => {
    expect(ids(day(2, () => ({ uv: 2.9 })))).not.toContain('sunglasses');
    expect(ids(day(2, () => ({ uv: 3 })))).toContain('sunglasses');
    expect(ids(day(2, () => ({ uv: 5.9 })))).not.toContain('sunscreen');
    expect(ids(day(2, () => ({ uv: 6 })))).toContain('sunscreen');
  });
  it('gust warning above 50 km/h', () => {
    expect(has(day(2, () => ({ gusts: 50 })), 'gusts')).toBe(false);
    expect(has(day(2, () => ({ gusts: 51 })), 'gusts')).toBe(true);
  });
  it('reflective kit when dark and cycling or running', () => {
    const dark = day(2, () => ({ isDay: false }));
    expect(has(dark, 'reflective', 'cycling')).toBe(true);
    expect(has(dark, 'reflective', 'running')).toBe(true);
    expect(has(dark, 'reflective', 'walking')).toBe(false);
    expect(has(day(2), 'reflective', 'cycling')).toBe(false);
  });
  it('layers you can take off when it warms 5° or more', () => {
    expect(has(day(3, (i) => ({ feels: [4, 6, 9][i] })), 'swing')).toBe(true);
    expect(has(day(3, (i) => ({ feels: [4, 6, 8.9][i] })), 'swing')).toBe(false);
    // Cooling down is not a swing you can undress for.
    expect(has(day(3, (i) => ({ feels: [12, 8, 5][i] })), 'swing')).toBe(false);
  });
});

describe('explain', () => {
  it('lists every rule that fired', () => {
    const a = advise({ hours: day(2, () => ({ feels: 1, precipProb: 35 })), activity: 'standing', manualOffset: 1 })!;
    expect(a.why.effective).toBe(-1);
    expect(a.why.manualOffset).toBe(1);
    expect(a.why.rules.some((r) => r.startsWith('Umbrella'))).toBe(true);
    expect(a.why.rules.some((r) => r.startsWith('Scarf'))).toBe(true);
  });
});
