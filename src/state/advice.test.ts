// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Routine, type Settings } from '../data/store';
import type { Forecast } from '../data/forecast-types';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { day } from '../engine/__tests__/fixtures';
import { planDay } from './advice';

// Thursday 26 November; the evening dog walk at 18:00 is the coldest hour.
const hours = day(48, (i) => ({ feels: i === 18 ? -1 : i < 12 ? 6 : 9 }), 0);
const forecast: Forecast = { lat: 51.5, lon: -0.1, timezone: 'Europe/London', utcOffsetSeconds: 0, hours, days: [], fetchedAt: 0 };
const DATE = '2026-11-26';

const routine = (over: Partial<Routine>): Routine => ({ id: 'dog', name: 'Dog walk', time: '18:00', hours: 0.5, days: [4], activity: 'walking', ...over });
// The band cases pin their engine so they keep checking band numbers whatever the default is.
const ctx = (over: { settings?: Partial<Settings>; routines?: Routine[]; activity?: Settings['activity']; effort?: 'easy' | 'steady' | 'hard' } = {}) => ({
  settings: { ...DEFAULT_SETTINGS, engine: 'bands' as const, ...over.settings },
  ratings: [],
  inventory: {},
  comfort: DEFAULT_COMFORT,
  activity: over.activity,
  effort: over.effort,
  routines: over.routines,
});
const commuteOn = { commute: { ...DEFAULT_SETTINGS.commute, enabled: true, out: '08:00', back: '17:00', days: [4] } };

describe('planDay with routines (US-066)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T06:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('is unchanged with no routines', () => {
    const plain = planDay(forecast, DATE, ctx());
    expect(planDay(forecast, DATE, ctx({ routines: [] }))).toEqual(plain);
    expect(plain!.legs).toBeUndefined();
  });

  it('is unchanged when no routine falls on the day', () => {
    const plain = planDay(forecast, DATE, ctx());
    expect(planDay(forecast, DATE, ctx({ routines: [routine({ days: [0, 6] })] }))).toEqual(plain);
  });

  it('is unchanged once today’s routines are over', () => {
    vi.setSystemTime(new Date('2026-11-26T19:10:00Z'));
    const plain = planDay(forecast, DATE, ctx());
    expect(planDay(forecast, DATE, ctx({ routines: [routine({})] }))).toEqual(plain);
  });

  it('dresses for a colder routine and lists it beside the rest of the day', () => {
    const p = planDay(forecast, DATE, ctx({ routines: [routine({})] }))!;
    expect(p.legs!.legs.map((l) => [l.leg.label, l.coldest])).toEqual([['Rest of the day', false], ['Dog walk', true]]);
    expect(p.advice.effective).toBe(-1);
    expect(p.legs!.notes).toContain('Hat for the dog walk — feels −1° at 18:00');
    expect(p.windowTimes.has('2026-11-26T18:00')).toBe(true);
  });

  it('adds routines to the commute legs', () => {
    const p = planDay(forecast, DATE, ctx({ settings: commuteOn, routines: [routine({})] }))!;
    expect(p.commute).toBeUndefined();
    expect(p.legs!.legs.map((l) => l.leg.label)).toEqual(['Out', 'Back', 'Dog walk']);
    expect(p.advice.effective).toBe(-1);
  });

  it('keeps the plain commute when no routine is on', () => {
    const p = planDay(forecast, DATE, ctx({ settings: commuteOn, routines: [routine({ days: [1] })] }))!;
    expect(p.commute).toBeDefined();
    expect(p.legs).toBeUndefined();
  });

  it('formats note temperatures in the chosen unit', () => {
    const p = planDay(forecast, DATE, ctx({ settings: { units: { ...DEFAULT_SETTINGS.units, temp: 'f' } }, routines: [routine({})] }))!;
    expect(p.legs!.notes).toContain('Hat for the dog walk — feels 30° at 18:00');
  });
});

describe('planDay with effort (US-067)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T12:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('scales the day’s activity', () => {
    const steady = planDay(forecast, DATE, ctx({ activity: 'running' }))!;
    const hard = planDay(forecast, DATE, ctx({ activity: 'running', effort: 'hard' }))!;
    expect(hard.advice.effective - steady.advice.effective).toBe(3);
  });

  it('leaves a commute by another mode at its own pace', () => {
    const mode = { commute: { ...commuteOn.commute, out: '13:00', mode: 'cycling' as const } };
    const steady = planDay(forecast, DATE, ctx({ settings: mode, activity: 'running' }))!;
    const hard = planDay(forecast, DATE, ctx({ settings: mode, activity: 'running', effort: 'hard' }))!;
    expect(hard.advice.effective).toBe(steady.advice.effective);
  });

  it('applies to a commute that follows the day’s activity', () => {
    const follow = { commute: { ...commuteOn.commute, out: '13:00' } };
    const steady = planDay(forecast, DATE, ctx({ settings: follow, activity: 'cycling' }))!;
    const hard = planDay(forecast, DATE, ctx({ settings: follow, activity: 'cycling', effort: 'hard' }))!;
    expect(hard.advice.effective - steady.advice.effective).toBe(2);
  });
});
