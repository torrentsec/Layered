// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { day } from '../engine/__tests__/fixtures';
import { dayAdvice, solarOffset, type Ctx } from './trip';

const hours = day(24, (i) => ({ temp: 3 + (i > 9 && i < 16 ? 4 : 0), feels: 1 }));
const date = hours[0].time.slice(0, 10);
const place = { lat: 51.51, lon: -0.13, utcOffsetSeconds: 0 };
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ manualOffset: 0, ratings: [], inventory: {}, comfort: DEFAULT_COMFORT, today: date, engine: 'science', bias: { mean: 0, count: 0 }, ...over });

describe('trip days dress like Today', () => {
  it('uses the science engine, with the bias, when it is on', () => {
    const plain = dayAdvice(hours, date, ['walking'], ctx(), place)!;
    const warmer = dayAdvice(hours, date, ['walking'], ctx({ bias: { mean: 0.3, count: 4 } }), place)!;
    expect(plain.requirements?.clo).toBeDefined();
    expect(warmer.requirements!.clo!.icl).toBeGreaterThan(plain.requirements!.clo!.icl);
  });

  it('counts each activity’s own window as the time outside', () => {
    const run = dayAdvice(hours, date, ['running'], ctx(), place)!;
    expect(run.science?.exposureMinutes).toBe(120);
  });

  it('keeps the bands when they are chosen, or when there is no place', () => {
    expect(dayAdvice(hours, date, ['walking'], ctx({ engine: 'bands' }), place)!.requirements?.clo).toBeUndefined();
    expect(dayAdvice(hours, date, ['walking'], ctx())!.requirements?.clo).toBeUndefined();
  });

  it('puts solar noon near midday for typical days, which have no time zone', () => {
    expect(solarOffset(-0.13)).toBe(0);
    expect(solarOffset(13.4)).toBe(3600);
    expect(solarOffset(-74)).toBe(-5 * 3600);
  });
});
