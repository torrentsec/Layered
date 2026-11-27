// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { addDays, weekday } from '../../src/data/format';
import type { PushSchedule } from '../../src/data/push-api';

/** Matches the cron interval: each scheduled time falls in exactly one run's window. */
export const WINDOW_MINUTES = 15;
/** Change alerts stop once people are usually home. */
export const ALERT_CUTOFF_MINUTES = 18 * 60;

export interface LocalClock {
  /** Local "YYYY-MM-DD". */
  date: string;
  /** Local "YYYY-MM-DDTHH:MM", the form the engine's hours use. */
  iso: string;
  minutes: number;
  /** Seconds east of UTC at this instant, for MET Norway's parser. */
  offsetSeconds: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    formatters.set(tz, f);
  }
  return f;
}

/** Wall-clock time in an IANA zone, or null if the zone is unknown. Intl carries the DST rules. */
export function localClock(tz: string, now: number): LocalClock | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatter(tz).formatToParts(new Date(now));
  } catch {
    return null;
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const hh = get('hour');
  const mm = get('minute');
  const wall = Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day')), Number(hh), Number(mm));
  return { date, iso: `${date}T${hh}:${mm}`, minutes: Number(hh) * 60 + Number(mm), offsetSeconds: Math.round((wall - Math.floor(now / 60_000) * 60_000) / 1000) };
}

export function minutesOf(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/**
 * The local date a scheduled time belongs to, if that time fell within the
 * last window (`[time, time + 15 min)` contains now). A late-evening time
 * whose window runs past midnight still belongs to the day it was set for.
 */
export function occasionDate(hhmm: string, clock: LocalClock): string | null {
  const t = minutesOf(hhmm);
  const elapsed = (clock.minutes - t + 1440) % 1440;
  if (elapsed >= WINDOW_MINUTES) return null;
  return clock.minutes < t ? addDays(clock.date, -1) : clock.date;
}

export interface Marks {
  lastMorning: string | null;
  lastEvening: string | null;
  lastAlert: string | null;
}

export interface Due {
  /** Date of today's outfit, or null. */
  morning: string | null;
  /** Date of the evening the heads-up belongs to; it advises for the day after. */
  evening: string | null;
  /** Date to re-check for a change alert, or null. */
  alert: string | null;
}

export function dueFor(s: PushSchedule, marks: Marks, clock: LocalClock): Due {
  const due: Due = { morning: null, evening: null, alert: null };
  if (s.morning) {
    const d = occasionDate(s.morning, clock);
    if (d && s.days.includes(weekday(d)) && marks.lastMorning !== d) due.morning = d;
  }
  if (s.evening) {
    const d = occasionDate(s.evening, clock);
    // The days are the days you're dressing for, so Sunday evening covers Monday.
    if (d && s.days.includes(weekday(addDays(d, 1))) && marks.lastEvening !== d) due.evening = d;
  }
  if (
    s.changeAlerts &&
    !due.morning &&
    marks.lastMorning === clock.date &&
    marks.lastAlert !== clock.date &&
    clock.minutes < ALERT_CUTOFF_MINUTES &&
    // Hourly is enough to catch a real change and keeps forecast requests within fair use.
    clock.minutes % 60 < WINDOW_MINUTES
  ) {
    due.alert = clock.date;
  }
  return due;
}
