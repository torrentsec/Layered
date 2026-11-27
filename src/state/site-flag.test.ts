// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { parseForecast } from '../data/forecast-types';
import { DEFAULT_SETTINGS } from '../data/store';
import { COMPLETE, DAYS, openMeteo } from './__fixtures__/golden-days';

const on = new Set<string>();
vi.mock('../data/flags', () => ({ flagOn: (name: string) => on.has(name) }));

const { flagSite, planDay } = await import('./advice');

afterEach(() => {
  on.clear();
  vi.useRealTimers();
});

function osloClo(): number {
  const c = DAYS.oslo;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(`${c.time}:00Z`) - c.utcOffset * 1000 + 5 * 60_000));
  const f = parseForecast(openMeteo(c) as Parameters<typeof parseForecast>[0], 0);
  const settings = { ...DEFAULT_SETTINGS, activity: 'walking' as const, duration: 0.5, engine: 'science' as const };
  const plan = planDay(f, c.time.slice(0, 10), { settings, ratings: [], inventory: COMPLETE, comfort: DEFAULT_COMFORT, garmentWarmth: {}, bias: { mean: 0, count: 0 } });
  return Math.round(plan!.advice.requirements!.clo!.icl * 100) / 100;
}

describe('site exposure flags (#86)', () => {
  it('leaves every place open with no flag', () => {
    expect(flagSite()).toBeUndefined();
    expect(osloClo()).toBe(1.65);
  });

  it('dresses every place as a street with site-street', () => {
    on.add('site-street');
    expect(flagSite()).toBe('street');
    expect(osloClo()).toBe(1.45);
  });

  it('uses shade with site-shade, and the street wins if both are on', () => {
    on.add('site-shade');
    expect(flagSite()).toBe('shade');
    on.add('site-street');
    expect(flagSite()).toBe('street');
  });
});
