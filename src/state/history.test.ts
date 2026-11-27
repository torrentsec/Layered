// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, history, places, ratings, settings, type DayRecord } from '../data/store';
import type { Forecast } from '../data/forecast-types';
import type { Place } from '../data/openmeteo';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { day } from '../engine/__tests__/fixtures';
import * as advice from './advice';
import { forecastState } from './forecast';
import { HISTORY_CAP, attachRatings, nextHistory, startHistory, todaysRecord, upsert, type Snapshot } from './history';

const DATE = '2026-11-26';
const hours = day(48, (i) => ({ feels: 4, precipProb: i === 10 ? 70 : 10, gusts: i === 9 ? 45 : 20 }), 0);
const forecast: Forecast = { lat: 51.5, lon: -0.1, timezone: 'Europe/London', utcOffsetSeconds: 0, hours, days: [], fetchedAt: 0 };
const place: Place = { id: 'home', name: 'Home', lat: 51.5, lon: -0.1 } as Place;

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  state: { status: 'ready', forecast },
  place,
  settings: DEFAULT_SETTINGS,
  ratings: [],
  inventory: {},
  comfort: DEFAULT_COMFORT,
  routines: [],
  deviceDate: DATE,
  ...over,
});

const rec = (date: string, over: Partial<DayRecord> = {}): DayRecord => ({
  date,
  activity: 'walking',
  effective: 5,
  band: 'coat',
  layers: [],
  extras: [],
  maxRain: 0,
  maxWind: 0,
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-26T08:20:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('todaysRecord (US-049, US-051)', () => {
  it('records today’s advice with the weather that drove it', () => {
    const r = todaysRecord(snap())!;
    expect(r.date).toBe(DATE);
    expect(r.activity).toBe('walking');
    expect(r.band).toBeTruthy();
    expect(r.layers.length).toBeGreaterThan(0);
    expect(r.maxRain).toBe(70);
    expect(r.maxWind).toBe(45);
    expect(r.rating).toBeUndefined();
  });

  it('flags an incomplete inventory when the advice has limitations', () => {
    const none = { counts: { thin: 0, medium: 0, thick: 0 } };
    expect(todaysRecord(snap())!.issue).toBeUndefined();
    expect(todaysRecord(snap({ inventory: { jumper: none, cardigan: none, hoodie: none, fleece: none } }))!.issue).toBe('incomplete-inventory');
  });

  it('records no-forecast on the device date when the forecast fails', () => {
    const r = todaysRecord(snap({ state: { status: 'error', error: 'x' }, deviceDate: '2026-11-25' }))!;
    expect(r).toMatchObject({ date: '2026-11-25', issue: 'no-forecast', band: '' });
  });

  it('records engine-error when planning throws', () => {
    vi.spyOn(advice, 'planDay').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(todaysRecord(snap())).toMatchObject({ date: DATE, issue: 'engine-error', band: '' });
  });

  it('says nothing while loading or without a place', () => {
    expect(todaysRecord(snap({ state: { status: 'loading' } }))).toBeNull();
    expect(todaysRecord(snap({ place: null }))).toBeNull();
  });
});

describe('upsert', () => {
  it('keeps one record per date and activity, newest first', () => {
    const a = upsert([rec('2026-11-24'), rec('2026-11-25')], rec('2026-11-25', { effective: 9 }));
    expect(a.map((r) => r.date)).toEqual(['2026-11-25', '2026-11-24']);
    expect(a[0].effective).toBe(9);
    const b = upsert(a, rec('2026-11-25', { activity: 'cycling' }));
    expect(b).toHaveLength(3);
  });

  it(`caps at ${HISTORY_CAP} days, dropping the oldest`, () => {
    let list: DayRecord[] = [];
    for (let i = 0; i < HISTORY_CAP + 5; i++) list = upsert(list, rec(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)));
    expect(list).toHaveLength(HISTORY_CAP);
    expect(list[0].date).toBe('2026-03-06');
    expect(list.at(-1)!.date).toBe('2026-01-06');
  });

  it('counts the cap in days, so two activities on one day don’t cost a day', () => {
    let list: DayRecord[] = [];
    for (let i = 0; i < HISTORY_CAP; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      list = upsert(upsert(list, rec(date)), rec(date, { activity: 'cycling' }));
    }
    expect(list).toHaveLength(HISTORY_CAP * 2);
    expect(new Set(list.map((r) => r.date)).size).toBe(HISTORY_CAP);
  });
});

describe('attachRatings', () => {
  it('adds a rating to the matching record', () => {
    const out = attachRatings([rec(DATE)], [{ date: DATE, activity: 'walking', rating: 0, effective: 5 }], DATE);
    expect(out[0].rating).toBe(0);
  });

  it('creates a record for a rating today under another activity', () => {
    const out = attachRatings([], [{ date: DATE, activity: 'cycling', rating: -1, effective: 3 }], DATE);
    expect(out[0]).toMatchObject({ date: DATE, activity: 'cycling', rating: -1, band: 'coat' });
  });

  it('leaves out older ratings with no record, so cleared history stays cleared', () => {
    expect(attachRatings([], [{ date: '2026-11-20', activity: 'walking', rating: 0, effective: 5 }], DATE)).toEqual([]);
  });

  it('returns the same list when nothing changed', () => {
    const list = [rec(DATE, { rating: 1 })];
    expect(attachRatings(list, [{ date: DATE, activity: 'walking', rating: 1, effective: 5 }], DATE)).toBe(list);
  });
});

describe('nextHistory', () => {
  it('keeps a rated day’s advice as it was when rated', () => {
    const rated = rec(DATE, { band: 'jacket', effective: 8, rating: 0 });
    const out = nextHistory([rated], snap({ ratings: [{ date: DATE, activity: 'walking', rating: 0, effective: 8 }] }));
    expect(out[0]).toEqual(rated);
  });

  it('doesn’t replace given advice with a later failed fetch', () => {
    const given = rec(DATE);
    expect(nextHistory([given], snap({ state: { status: 'error' } }))[0]).toEqual(given);
  });

  it('replaces a failed fetch once advice arrives', () => {
    const out = nextHistory([rec(DATE, { band: '', issue: 'no-forecast' })], snap());
    expect(out).toHaveLength(1);
    expect(out[0].band).not.toBe('');
  });
});

describe('startHistory', () => {
  it('records from the live signals and picks up ratings as they appear', () => {
    history.value = [];
    ratings.value = [];
    places.value = [place];
    settings.value = { ...DEFAULT_SETTINGS, placeId: 'home' };
    forecastState.value = { status: 'ready', forecast };
    const stop = startHistory();
    expect(history.value).toHaveLength(1);
    expect(history.value[0].date).toBe(DATE);
    ratings.value = [{ date: DATE, activity: 'walking', rating: 1, effective: history.value[0].effective }];
    expect(history.value[0].rating).toBe(1);
    stop();
  });
});
