// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { effect } from '@preact/signals';
import { bandFor } from '../engine/bands';
import { localNow } from '../engine/time';
import type { Advice, Activity, Rating } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import type { ComfortProfile } from '../engine/comfort';
import type { Place } from '../data/openmeteo';
import { comfort, history, inventory, ratings, routines, settings, type DayRecord, type Routine, type Settings } from '../data/store';
import { currentPlace, forecastState, type ForecastState } from './forecast';
import { planDay } from './advice';

/** US-049: about two months of days is enough to see a pattern without hoarding. */
export const HISTORY_CAP = 60;

export interface Snapshot {
  state: ForecastState;
  place: Place | null;
  settings: Settings;
  ratings: Rating[];
  inventory: Inventory;
  comfort: ComfortProfile;
  routines: Routine[];
  /** Device's local date, for days the forecast never arrived and so has no clock of its own. */
  deviceDate: string;
}

const same = (a: { date: string; activity: Activity }, b: { date: string; activity: Activity }) => a.date === b.date && a.activity === b.activity;

/** One record per date and activity, most recent date first, capped at HISTORY_CAP dates. */
export function upsert(list: DayRecord[], rec: DayRecord): DayRecord[] {
  const rest = list.filter((r) => !same(r, rec));
  const sorted = [rec, ...rest].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const dates = [...new Set(sorted.map((r) => r.date))];
  if (dates.length <= HISTORY_CAP) return sorted;
  const oldest = dates[HISTORY_CAP - 1];
  return sorted.filter((r) => r.date >= oldest);
}

/** `maxRain` is the highest chance of rain in the advice window, in percent; `maxWind` the strongest gust, km/h. */
export function recordFromAdvice(date: string, activity: Activity, advice: Advice): DayRecord {
  const rec: DayRecord = {
    date,
    activity,
    effective: advice.effective,
    band: advice.band,
    layers: advice.layers.map((l) => l.label),
    extras: advice.extras.map((e) => e.label),
    maxRain: Math.max(0, ...advice.hours.map((h) => h.precipProb)),
    maxWind: Math.max(0, ...advice.hours.map((h) => h.gusts)),
  };
  if (advice.limitations?.length) rec.issue = 'incomplete-inventory';
  return rec;
}

const failed = (date: string, activity: Activity, issue: 'no-forecast' | 'engine-error'): DayRecord => ({
  date,
  activity,
  effective: 0,
  band: '',
  layers: [],
  extras: [],
  maxRain: 0,
  maxWind: 0,
  issue,
});

/**
 * Today's record from the current state, or null when there's nothing to say yet
 * (no place, still loading). Planning mirrors Today's defaults: the saved activity,
 * duration and routines.
 */
export function todaysRecord(s: Snapshot): DayRecord | null {
  if (!s.place) return null;
  const activity = s.settings.activity;
  if (s.state.status === 'error') return failed(s.deviceDate, activity, 'no-forecast');
  const f = s.state.forecast;
  if (s.state.status !== 'ready' || !f) return null;
  const date = localNow(f.utcOffsetSeconds).slice(0, 10);
  try {
    const plan = planDay(f, date, { settings: s.settings, ratings: s.ratings, inventory: s.inventory, comfort: s.comfort, routines: s.routines });
    return plan ? recordFromAdvice(date, activity, plan.advice) : null;
  } catch {
    return failed(date, activity, 'engine-error');
  }
}

/**
 * Ratings become part of their day's record. A rating today for an activity
 * other than the default gets a record of its own; older ratings without a
 * record stay out, so cleared history doesn't creep back.
 */
export function attachRatings(list: DayRecord[], rs: Rating[], today: string): DayRecord[] {
  let out = list;
  for (const r of rs) {
    const rec = out.find((x) => same(x, r));
    if (rec?.rating === r.rating || (!rec && r.date !== today)) continue;
    const next: DayRecord = rec
      ? { ...rec, rating: r.rating }
      : { date: r.date, activity: r.activity, effective: r.effective, band: bandFor(r.effective).id, layers: [], extras: [], maxRain: 0, maxWind: 0, rating: r.rating };
    out = upsert(out, next);
  }
  return out;
}

export function nextHistory(list: DayRecord[], s: Snapshot): DayRecord[] {
  let out = list;
  const rec = todaysRecord(s);
  if (rec) {
    const old = out.find((x) => same(x, rec));
    // Once rated, a day's advice is kept as it was when it was rated, and a failed
    // fetch later on doesn't erase advice that was already given.
    const keepOld = old && (old.rating !== undefined || (!rec.band && !!old.band));
    if (!keepOld) out = upsert(out, rec);
  }
  return attachRatings(out, s.ratings, rec?.date ?? s.deviceDate);
}

/** The device's local date, YYYY-MM-DD. */
export function localDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Keeps `history` in step with today's advice and ratings. Returns the disposer. */
export function startHistory(): () => void {
  return effect(() => {
    const snap: Snapshot = {
      state: forecastState.value,
      place: currentPlace.value,
      settings: settings.value,
      ratings: ratings.value,
      inventory: inventory.value,
      comfort: comfort.value,
      routines: routines.value,
      deviceDate: localDate(),
    };
    const prev = history.peek();
    const next = nextHistory(prev, snap);
    // Every forecast refresh lands here; only a real change is worth a storage write.
    if (JSON.stringify(next) !== JSON.stringify(prev)) history.value = next;
  });
}
