// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import {
  CERTAINTY_LABEL,
  LOW_CERTAINTY_HEDGE,
  certaintyFor,
  hedgeRequirements,
  preferRemovable,
  rainUndecided,
} from '../certainty';
import { actualRange } from '../actual';
import { requirementsFor } from '../requirements';
import { day } from './fixtures';

const dry = day(6);
const torn = (n: number, of = 6) => day(of, (i) => ({ precipProb: i < n ? 45 : 5 }));

describe('certainty by lead time', () => {
  it.each([0, 1, 2])('day %i is high', (d) => expect(certaintyFor(d, dry)).toBe('high'));
  it.each([3, 4, 5, 6])('day %i is medium', (d) => expect(certaintyFor(d, dry)).toBe('medium'));
  it.each([7, 10, 15])('day %i is low', (d) => expect(certaintyFor(d, dry)).toBe('low'));
  it('treats no hours as no rain signal', () => expect(certaintyFor(0, [])).toBe('high'));
});

describe('undecided rain', () => {
  it('counts when half the window sits at 30–60%', () => expect(rainUndecided(torn(3))).toBe(true));
  it('needs at least half the window', () => expect(rainUndecided(torn(2))).toBe(false));
  it('includes both ends of the range', () => {
    expect(rainUndecided(day(2, (i) => ({ precipProb: i ? 30 : 60 })))).toBe(true);
    expect(rainUndecided(day(2, (i) => ({ precipProb: i ? 29 : 61 })))).toBe(false);
  });
  it('a clear wet signal is not undecided', () => expect(rainUndecided(day(6, () => ({ precipProb: 90 })))).toBe(false));
  it('is false with no hours', () => expect(rainUndecided([])).toBe(false));
  it('lowers high to medium', () => expect(certaintyFor(1, torn(6))).toBe('medium'));
  it('lowers medium to low', () => expect(certaintyFor(4, torn(6))).toBe('low'));
  it('leaves low as low', () => expect(certaintyFor(9, torn(6))).toBe('low'));
});

describe('certainty labels', () => {
  it('marks only less certain days, in words', () => {
    expect(CERTAINTY_LABEL.high).toBeUndefined();
    expect(CERTAINTY_LABEL.medium).toBe('less certain');
    expect(CERTAINTY_LABEL.low).toBe('rough guide');
  });
});

describe('removable layers when unsure', () => {
  it('applies within 2° of a band edge on a low day', () => {
    expect(LOW_CERTAINTY_HEDGE).toBe(2);
    for (const edge of [2, 7, 12, 17, 22]) {
      expect(preferRemovable('low', edge)).toBe(true);
      expect(preferRemovable('low', edge + 2)).toBe(true);
      expect(preferRemovable('low', edge - 2)).toBe(true);
    }
  });
  it('not further than 2° from an edge', () => {
    expect(preferRemovable('low', 4.5)).toBe(false);
    expect(preferRemovable('low', 9.5)).toBe(false);
    expect(preferRemovable('low', -1)).toBe(false);
    expect(preferRemovable('low', 30)).toBe(false);
  });
  it('not on medium or high days', () => {
    expect(preferRemovable('medium', 7)).toBe(false);
    expect(preferRemovable('high', 7)).toBe(false);
  });

  const stats = { maxWind: 10, maxGust: 15, warming: 0, snow: false } as unknown as Parameters<typeof requirementsFor>[0]['stats'];
  const req = (effective: number) => requirementsFor({ effective, band: 'jacket', stats, extras: [], activity: 'walking' });

  it('marks requirements removable on a low day near an edge', () => {
    const r = req(8.5);
    expect(r.removable).toBe(false);
    expect(hedgeRequirements(r, 'low')).toMatchObject({ removable: true, removableWhy: 'edge' });
  });
  it('leaves requirements alone otherwise', () => {
    const r = req(8.5);
    expect(hedgeRequirements(r, 'medium')).toBe(r);
    expect(hedgeRequirements(req(9.5), 'low').removable).toBe(false);
  });
  it('keeps an existing reason', () => {
    const r = { ...req(8.5), removable: true, removableWhy: 'warming' as const };
    expect(hedgeRequirements(r, 'low')).toBe(r);
  });
});

describe('actual temperature', () => {
  it('spans the real temperature of the window', () => {
    const h = day(4, (i) => ({ temp: [6, 4, 9, 7][i], feels: 1 }));
    expect(actualRange(h)).toEqual({ min: 4, max: 9 });
  });
  it('is null with no hours', () => expect(actualRange([])).toBeNull());
});
