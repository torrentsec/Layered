// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { advise, colderThan, mergedScience, type AdviseInput } from './advise';
import { bandRank } from './bands';
import { firstWet, wetWord } from './rain';
import { fmt24, type TimeFormatter } from './time';
import { selectWindow } from './window';
import type { Activity, Advice, Effort, Extra, Hour } from './types';

/** The shape of a saved routine (US-065); the stored one adds an id. */
export interface RoutineSpec {
  name: string;
  /** Local "HH:MM". */
  time: string;
  hours: number;
  /** 0 = Sunday, as Date#getDay. */
  days: number[];
  activity: Activity;
  effort?: Effort;
}

/** Shortest and longest routine, in hours; half-hour steps. */
export const ROUTINE_MIN_HOURS = 0.5;
export const ROUTINE_MAX_HOURS = 3;
export const ROUTINE_HOURS = [0.5, 1, 1.5, 2, 2.5, 3];

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** One-tap starting points for the two routines people mention most. */
export const ROUTINE_PRESETS: RoutineSpec[] = [
  { name: 'School run', time: '08:15', hours: 0.5, days: WEEKDAYS, activity: 'walking' },
  { name: 'Dog walk', time: '07:00', hours: 0.5, days: EVERY_DAY, activity: 'walking' },
];

export function clampRoutineHours(h: number): number {
  if (!Number.isFinite(h)) return ROUTINE_MIN_HOURS;
  const half = Math.round(h * 2) / 2;
  return Math.min(ROUTINE_MAX_HOURS, Math.max(ROUTINE_MIN_HOURS, half));
}

export function lengthLabel(h: number): string {
  return h < 1 ? `${Math.round(h * 60)} min` : `${h} h`;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Monday first, as people plan their week.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function daysLabel(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  if (set.size === 0) return 'No days';
  if (set.size === 5 && WEEKDAYS.every((d) => set.has(d))) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  return WEEK_ORDER.filter((d) => set.has(d)).map((d) => DAY_SHORT[d]).join(', ');
}

const weekdayOf =(date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Routines scheduled on a local date, earliest first. */
export function routinesOn<R extends RoutineSpec>(routines: R[], date: string): R[] {
  const d = weekdayOf(date);
  return routines.filter((r) => r.days.includes(d)).sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * "Dog walk" reads as "the dog walk" in a sentence. A possessive first word
 * ("Sam’s football") is already specific, so it keeps its own wording.
 */
export function routinePhrase(name: string): string {
  const n = name.trim();
  if (!n) return 'the routine';
  if (/^\S+['’]s\b/.test(n)) return n;
  return `the ${n[0].toLowerCase()}${n.slice(1)}`;
}

/** One stretch outdoors with its own activity: a commute leg, a routine, the rest of the day. */
export interface Leg {
  id: string;
  /** For lists: "Dog walk", "Out". */
  label: string;
  /** For sentences: "the dog walk", "the way home". */
  phrase: string;
  activity: Activity;
  effort?: Effort;
  hours: Hour[];
  /** Local start when it isn't on the hour, for display ("2026-11-26T08:15"). */
  start?: string;
}

/**
 * Forecast hours a routine covers: every hour that its start-to-end span
 * touches, so 07:45 for half an hour includes both 07:00 and 08:00. With
 * `now`, hours already gone are dropped.
 */
export function routineHours(hours: Hour[], date: string, r: Pick<RoutineSpec, 'time' | 'hours'>, now?: string): Hour[] {
  const [hh, mm] = r.time.split(':').map(Number);
  const start = (hh || 0) * 60 + (mm || 0);
  const end = start + clampRoutineHours(r.hours) * 60;
  const count = Math.ceil(end / 60) - Math.floor(start / 60);
  const from = `${date}T${String(Math.floor(start / 60)).padStart(2, '0')}:00`;
  const w = selectWindow(hours, from, count).filter((h) => h.time.startsWith(date));
  return now ? w.filter((h) => h.time.slice(0, 13) >= now.slice(0, 13)) : w;
}

export function routineLegs<R extends RoutineSpec & { id: string }>(hours: Hour[], date: string, routines: R[], now?: string): Leg[] {
  const legs: Leg[] = [];
  for (const r of routinesOn(routines, date)) {
    const h = routineHours(hours, date, r, now);
    if (h.length) legs.push({ id: r.id, label: r.name, phrase: routinePhrase(r.name), activity: r.activity, effort: r.effort, hours: h, start: `${date}T${r.time}` });
  }
  return legs;
}

export interface LegAdvice {
  leg: Leg;
  advice: Advice;
  coldest: boolean;
}

export interface LegsAdvice {
  /** What to wear: the coldest leg's layers with every leg's extras. */
  advice: Advice;
  /** In time order. */
  legs: LegAdvice[];
  notes: string[];
}

export type DegreeFormatter = (c: number) => string;

const degC: DegreeFormatter = (c) => `${Math.round(c)}°`.replace('-', '−');

function joinPhrases(p: string[]): string {
  return p.length < 2 ? (p[0] ?? '') : `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}`;
}

function detail(e: Extra, la: LegAdvice, fmt: TimeFormatter, deg: DegreeFormatter): string {
  if (e.tone === 'rain') {
    const wet = firstWet(la.leg.hours);
    return wet ? ` — ${wetWord(la.leg.hours)} from ${fmt(wet.time)}` : '';
  }
  if (e.tone === 'cold') return ` — feels ${deg(la.advice.minFeels)} at ${fmt(la.advice.why.coldestHour)}`;
  return '';
}

// Swing is about a single stretch outdoors; across several it's noise.
const SKIP_IN_NOTES = new Set(['swing']);

/**
 * Dresses for the coldest leg and carries every leg's extras, the same way
 * the commute does for two. Notes name the legs that need something the
 * others don't. Returns null when no leg has forecast hours.
 */
export function adviseLegs(
  base: Omit<AdviseInput, 'hours' | 'activity' | 'effort'>,
  legs: Leg[],
  fmt: TimeFormatter = fmt24,
  deg: DegreeFormatter = degC,
): LegsAdvice | null {
  const judged: LegAdvice[] = [];
  for (const leg of legs) {
    const a = advise({ ...base, activity: leg.activity, effort: leg.effort, hours: leg.hours });
    if (a) judged.push({ leg, advice: a, coldest: false });
  }
  if (!judged.length) return null;
  const startOf = (j: LegAdvice) => j.leg.start ?? j.leg.hours[0].time;
  judged.sort((a, b) => startOf(a).localeCompare(startOf(b)));

  let cold = judged[0];
  let warm = judged[0];
  for (const j of judged) {
    if (colderThan(j.advice, cold.advice)) cold = j;
    if (colderThan(warm.advice, j.advice)) warm = j;
  }
  cold.coldest = true;

  const seen = new Set<string>();
  const extras: Extra[] = [];
  for (const e of [cold, ...judged].flatMap((j) => j.advice.extras)) {
    if (seen.has(e.id) || (judged.length > 1 && SKIP_IN_NOTES.has(e.id))) continue;
    seen.add(e.id);
    extras.push(e);
  }
  // A hood already covers the rain an umbrella would.
  const merged = extras.some((e) => e.id === 'hood') ? extras.filter((e) => e.id !== 'umbrella') : extras;

  const notes: string[] = [];
  if (judged.length > 1) {
    for (const e of extras) {
      if (SKIP_IN_NOTES.has(e.id)) continue;
      const needing = judged.filter((j) => j.advice.extras.some((x) => x.id === e.id));
      if (needing.length === judged.length) continue;
      const worst = needing.reduce((a, b) => (b.advice.minFeels < a.advice.minFeels ? b : a));
      notes.push(`${e.label} for ${joinPhrases(needing.map((j) => j.leg.phrase))}${needing.length === 1 ? detail(e, worst, fmt, deg) : ''}`);
    }
    if (bandRank(cold.advice.band) !== bandRank(warm.advice.band)) {
      const word = judged.length === 2 ? 'Colder' : 'Coldest';
      notes.push(`${word} on ${cold.leg.phrase} (${deg(cold.advice.effective)} vs ${deg(warm.advice.effective)})`);
    }
  }

  const hours = [...new Map(judged.flatMap((j) => j.leg.hours).map((h) => [h.time, h])).values()].sort((a, b) => a.time.localeCompare(b.time));
  const which = judged.length === 2 ? 'the colder leg' : 'the coldest part of the day';
  const advice: Advice = {
    ...cold.advice,
    extras: merged,
    minFeels: Math.min(...judged.map((j) => j.advice.minFeels)),
    maxFeels: Math.max(...judged.map((j) => j.advice.maxFeels)),
    hours,
    ...(cold.advice.science ? { science: mergedScience(cold.advice, judged.map((j) => j.advice)) } : {}),
    why: {
      ...cold.advice.why,
      rules: judged.length > 1 ? [`Dressing for ${cold.leg.phrase}, ${which}`, ...cold.advice.why.rules, ...notes] : cold.advice.why.rules,
    },
  };
  return { advice, legs: judged, notes };
}
