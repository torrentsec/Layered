// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { BANDS } from './bands';
import { ACTIVITIES } from './activity';
import type { Activity, BandId } from './types';

export type Issue = 'no-forecast' | 'engine-error' | 'incomplete-inventory';

/** The parts of a stored DayRecord the track record reads; kept here so the engine never imports storage. */
export interface RecordedDay {
  date: string;
  activity: Activity;
  /** Empty when no advice could be given. */
  band: string;
  rating?: -1 | 0 | 1;
  issue?: Issue;
}

export interface Tally {
  /** Days with advice in this group, rated or not. */
  days: number;
  rated: number;
  justRight: number;
  tooCold: number;
  tooWarm: number;
  /** justRight / rated, or null with nothing rated. */
  rate: number | null;
}

export interface Group<K extends string> extends Tally {
  key: K;
}

export type Trend = 'better' | 'worse' | 'steady' | 'too-few';

export interface TrackRecord {
  overall: Tally;
  recent: Tally;
  previous: Tally;
  trend: Trend;
  byBand: Group<BandId>[];
  byActivity: Group<Activity>[];
  issues: Record<Issue, number>;
}

/** Days in each half of the trend comparison (US-050). */
export const TREND_DAYS = 14;
/** Fewer ratings than this in either fortnight and a change is just noise. */
export const TREND_MIN_RATED = 3;
/** Change in suitability rate, as a fraction, that counts as a real move. */
export const TREND_STEP = 0.1;

function tally(records: RecordedDay[]): Tally {
  const t: Tally = { days: records.length, rated: 0, justRight: 0, tooCold: 0, tooWarm: 0, rate: null };
  for (const r of records) {
    if (r.rating === undefined) continue;
    t.rated++;
    if (r.rating === 0) t.justRight++;
    else if (r.rating < 0) t.tooCold++;
    else t.tooWarm++;
  }
  t.rate = t.rated ? t.justRight / t.rated : null;
  return t;
}

/** Whole days from `date` back to `today`, both YYYY-MM-DD. */
export function ageInDays(today: string, date: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
}

export function trendOf(recent: Tally, previous: Tally): Trend {
  if (recent.rated < TREND_MIN_RATED || previous.rated < TREND_MIN_RATED) return 'too-few';
  const d = (recent.rate ?? 0) - (previous.rate ?? 0);
  // A hair under the step still counts, so 0.3 − 0.2 isn't lost to floating point.
  if (d >= TREND_STEP - 1e-9) return 'better';
  if (d <= -TREND_STEP + 1e-9) return 'worse';
  return 'steady';
}

/** Records without advice (no forecast, engine error) have no band and only count as issues. */
const advised = (r: RecordedDay) => !!r.band;

export function trackRecord(history: RecordedDay[], today: string): TrackRecord {
  const days = history.filter(advised);
  const age = (r: RecordedDay) => ageInDays(today, r.date);
  const recent = days.filter((r) => age(r) >= 0 && age(r) < TREND_DAYS);
  const previous = days.filter((r) => age(r) >= TREND_DAYS && age(r) < TREND_DAYS * 2);

  const groups = <K extends string>(keys: readonly K[], keyOf: (r: RecordedDay) => string): Group<K>[] =>
    keys
      .map((key) => ({ key, ...tally(days.filter((r) => keyOf(r) === key)) }))
      .filter((g) => g.days > 0);

  const issues: Record<Issue, number> = { 'no-forecast': 0, 'engine-error': 0, 'incomplete-inventory': 0 };
  for (const r of history) if (r.issue) issues[r.issue]++;

  const r = tally(recent);
  const p = tally(previous);
  return {
    overall: tally(days),
    recent: r,
    previous: p,
    trend: trendOf(r, p),
    byBand: groups(BANDS.map((b) => b.id), (x) => x.band),
    byActivity: groups(ACTIVITIES, (x) => x.activity),
    issues,
  };
}

/** "82%", rounded to whole percent. */
export const percent = (rate: number): string => `${Math.round(rate * 100)}%`;
