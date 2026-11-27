// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Innovation spike #84: ways to headline "feels like" that people can square
// with other apps, without touching the advice. Only the display changes; the
// clothing target still comes from IREQ.

import type { Advice, Hour } from '../engine/types';
import { flagOn, type Flag } from './flags';
import { fmtTemp, type TempUnit } from './units';
import { RADIANT_MENTION, STRESS_LABEL, heroReading } from './why-science';

/** JAG/TI wind chill holds at or below this air temperature, °C. */
export const WIND_CHILL_MAX_TA = 10;
/** JAG/TI wind chill needs at least this 10 m wind, km/h (about walking speed). */
export const WIND_CHILL_MIN_WIND = 4.8;
/** From this wind, km/h, the wind is named as the reason it feels colder than the air. */
export const WIND_CAUSE = 10;

/**
 * Wind chill as the Met Office, Environment Canada and the US National
 * Weather Service publish it (JAG/TI 2001), so the number matches theirs.
 * Null outside the range the formula was fitted for.
 */
export function windChill(taC: number, windKmh: number): number | null {
  if (!Number.isFinite(taC) || !Number.isFinite(windKmh)) return null;
  if (taC > WIND_CHILL_MAX_TA || windKmh < WIND_CHILL_MIN_WIND) return null;
  const v = windKmh ** 0.16;
  return 13.12 + 0.6215 * taC - 11.37 * v + 0.3965 * taC * v;
}

/** The "feels like" most weather apps would show for an hour: wind chill when it applies, else apparent temperature. */
export function familiarFeels(h: Hour): number {
  return windChill(h.temp, h.wind) ?? h.feels;
}

export type FeelsVariant = 'utci' | 'familiar' | 'actual';
export const FEELS_VARIANTS: readonly FeelsVariant[] = ['utci', 'familiar', 'actual'];

/** The wording on trial from `?flags=feels-familiar` or `?flags=feels-actual`; null keeps today's hero. */
export function feelsTrial(on: (f: Flag) => boolean = flagOn): Exclude<FeelsVariant, 'utci'> | null {
  if (on('feels-familiar')) return 'familiar';
  return on('feels-actual') ? 'actual' : null;
}

export interface CalibratedReading {
  /** Drives the circle's colour, °C. */
  value: number;
  text: string;
  /** Read before the number by screen readers. */
  label: string;
  /** One short line under the number; empty when there is nothing to add. */
  note: string;
}

/**
 * The hero number and its note under one of the tested wordings. Without the
 * science engine, or when UTCI has no number, every variant falls back to
 * today's reading so the spike never invents a figure.
 */
export function calibratedReading(a: Advice, variant: FeelsVariant, u: TempUnit): CalibratedReading {
  const plain = heroReading(a, u);
  const s = a.science;
  const r = s?.utci;
  if (variant === 'utci' || !s || !r || r.outOfRange || !Number.isFinite(r.utci)) return { ...plain, note: '' };
  const hour = a.hours.find((h) => h.time === s.coldestHour);
  if (variant === 'familiar') {
    const f = hour ? familiarFeels(hour) : r.utci;
    return { value: f, text: fmtTemp(f, u), label: 'Feels like', note: STRESS_LABEL[r.category] };
  }
  const colder = r.utci < s.ta;
  const cause = colder
    ? (hour && hour.wind >= WIND_CAUSE ? ' in the wind' : '')
    : s.tmrtDelta >= RADIANT_MENTION ? ' in the sun' : '';
  const same = fmtTemp(r.utci, u) === fmtTemp(s.ta, u);
  return { value: s.ta, text: fmtTemp(s.ta, u), label: 'Actual', note: same ? '' : `Feels ${fmtTemp(r.utci, u)}${cause}` };
}

/** The familiar feels-like across the window, for the range under the number. */
export function familiarRange(hours: Hour[]): { min: number; max: number } | null {
  if (hours.length === 0) return null;
  const f = hours.map(familiarFeels).filter(Number.isFinite);
  return f.length ? { min: Math.min(...f), max: Math.max(...f) } : null;
}
