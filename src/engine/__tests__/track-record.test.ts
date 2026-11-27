// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it } from 'vitest';
import { TREND_DAYS, TREND_MIN_RATED, ageInDays, percent, trackRecord, trendOf, type RecordedDay } from '../track-record';

const TODAY = '2026-11-27';
const ago = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const day = (n: number, over: Partial<RecordedDay> = {}): RecordedDay => ({ date: ago(n), activity: 'walking', band: 'coat', ...over });

describe('trackRecord (US-050)', () => {
  it('is just-right days over rated days', () => {
    const t = trackRecord([day(0, { rating: 0 }), day(1, { rating: 0 }), day(2, { rating: -1 }), day(3, { rating: 1 }), day(4)], TODAY);
    expect(t.overall).toMatchObject({ days: 5, rated: 4, justRight: 2, tooCold: 1, tooWarm: 1, rate: 0.5 });
  });

  it('has no rate with nothing rated', () => {
    expect(trackRecord([day(0)], TODAY).overall.rate).toBeNull();
    expect(trackRecord([], TODAY).overall.rate).toBeNull();
  });

  it('leaves days without advice out of the rate but counts their issues (US-051)', () => {
    const t = trackRecord(
      [day(0, { band: '', issue: 'no-forecast' }), day(1, { band: '', issue: 'engine-error' }), day(2, { issue: 'incomplete-inventory', rating: 0 })],
      TODAY,
    );
    expect(t.overall.days).toBe(1);
    expect(t.issues).toEqual({ 'no-forecast': 1, 'engine-error': 1, 'incomplete-inventory': 1 });
  });

  it('splits by band in band order and by activity (US-052)', () => {
    const t = trackRecord([day(0, { band: 'coat', rating: 0 }), day(1, { band: 'tshirt', rating: -1 }), day(2, { band: 'coat', activity: 'cycling' })], TODAY);
    expect(t.byBand.map((g) => [g.key, g.days, g.rate])).toEqual([
      ['tshirt', 1, 0],
      ['coat', 2, 1],
    ]);
    expect(t.byActivity.map((g) => [g.key, g.days, g.rated])).toEqual([
      ['walking', 2, 2],
      ['cycling', 1, 0],
    ]);
  });
});

describe('trend', () => {
  const rated = (from: number, values: (-1 | 0 | 1)[]) => values.map((rating, i) => day(from + i, { rating }));

  it(`compares the last ${TREND_DAYS} days with the ${TREND_DAYS} before`, () => {
    const t = trackRecord([...rated(0, [0, 0, 0, 1]), ...rated(TREND_DAYS, [0, 1, 1, -1]), day(TREND_DAYS * 2, { rating: 1 })], TODAY);
    expect(t.recent).toMatchObject({ rated: 4, justRight: 3 });
    expect(t.previous).toMatchObject({ rated: 4, justRight: 1 });
    expect(t.trend).toBe('better');
  });

  it('puts day 13 in the recent fortnight and day 14 in the previous one', () => {
    const t = trackRecord([day(TREND_DAYS - 1, { rating: 0 }), day(TREND_DAYS, { rating: 0 })], TODAY);
    expect(t.recent.rated).toBe(1);
    expect(t.previous.rated).toBe(1);
  });

  it(`needs ${TREND_MIN_RATED} ratings in each fortnight`, () => {
    const few = { days: 2, rated: TREND_MIN_RATED - 1, justRight: 2, tooCold: 0, tooWarm: 0, rate: 1 };
    const enough = { days: 3, rated: TREND_MIN_RATED, justRight: 0, tooCold: 3, tooWarm: 0, rate: 0 };
    expect(trendOf(few, enough)).toBe('too-few');
    expect(trendOf(enough, few)).toBe('too-few');
  });

  it('calls a move of 10 points or more better or worse, less is steady', () => {
    const t = (rate: number) => ({ days: 10, rated: 10, justRight: rate * 10, tooCold: 0, tooWarm: 0, rate });
    expect(trendOf(t(0.6), t(0.5))).toBe('better');
    expect(trendOf(t(0.5), t(0.6))).toBe('worse');
    expect(trendOf(t(0.55), t(0.5))).toBe('steady');
    expect(trendOf(t(0.3), t(0.2))).toBe('better');
  });
});

describe('helpers', () => {
  it('counts days between dates across month ends', () => {
    expect(ageInDays('2026-12-01', '2026-11-27')).toBe(4);
    expect(ageInDays('2026-11-27', '2026-11-27')).toBe(0);
  });

  it('rounds percentages', () => {
    expect(percent(0.824)).toBe('82%');
    expect(percent(2 / 3)).toBe('67%');
  });
});
