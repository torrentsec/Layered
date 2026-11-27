// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Hour } from '../engine/types';
import type { DayInfo, Forecast } from './forecast-types';

/**
 * Saved forecasts as columns: one array per Hour field instead of one object
 * per hour, so the eighteen key names are written once rather than 384 times.
 * Every Hour field is read by an engine or screen, so nothing is dropped.
 */
export const PACK_VERSION = 2;

const REQUIRED = ['temp', 'feels', 'precipProb', 'precip', 'snow', 'wind', 'gusts', 'uv', 'code'] as const;
const OPTIONAL = ['visibility', 'rh', 'cloud', 'ghi', 'direct', 'diffuse', 'dni'] as const;

type Stored = 'time' | 'isDay' | (typeof REQUIRED)[number] | (typeof OPTIONAL)[number];
// Fails to compile when Hour gains a field the columns don't store, so it can't be lost on save.
const covers: [Exclude<keyof Hour, Stored>] extends [never] ? true : never = true;
void covers;

export interface PackedForecast {
  v: typeof PACK_VERSION;
  lat: number;
  lon: number;
  timezone: string;
  utcOffsetSeconds: number;
  fetchedAt: number;
  source?: Forecast['source'];
  days: DayInfo[];
  /** First local hour; with `n`, the rest follow hour by hour. */
  t0: string;
  n: number;
  /** Only when the hours aren't one unbroken hourly run (MET Norway's 6-hourly tail, a skipped hour). */
  times?: string[];
  isDay: (0 | 1)[];
  cols: Record<(typeof REQUIRED)[number], number[]> & Partial<Record<(typeof OPTIONAL)[number], (number | null)[]>>;
}

/** Wall-clock hour arithmetic on "YYYY-MM-DDTHH:MM", done in UTC so no zone shifts it. */
function addHours(t0: string, i: number): string {
  const d = new Date(`${t0}:00Z`);
  d.setUTCHours(d.getUTCHours() + i);
  return d.toISOString().slice(0, 16);
}

/** Both providers give at most two decimals; this only trims float noise like 0.30000000000000004. */
const trim = (n: number) => Math.round(n * 100) / 100;

export function packForecast(f: Forecast): PackedForecast {
  const hours = f.hours;
  const t0 = hours[0]?.time ?? '';
  const regular = hours.every((h, i) => h.time === addHours(t0, i));
  const cols = {} as PackedForecast['cols'];
  for (const k of REQUIRED) cols[k] = hours.map((h) => trim(h[k]));
  for (const k of OPTIONAL) {
    if (hours.some((h) => h[k] !== undefined)) cols[k] = hours.map((h) => (h[k] === undefined ? null : trim(h[k])));
  }
  return {
    v: PACK_VERSION,
    lat: f.lat,
    lon: f.lon,
    timezone: f.timezone,
    utcOffsetSeconds: f.utcOffsetSeconds,
    fetchedAt: f.fetchedAt,
    ...(f.source ? { source: f.source } : {}),
    days: f.days,
    t0,
    n: hours.length,
    ...(regular ? {} : { times: hours.map((h) => h.time) }),
    isDay: hours.map((h) => (h.isDay ? 1 : 0)),
    cols,
  };
}

function unpack(p: PackedForecast): Forecast {
  const hours: Hour[] = [];
  for (let i = 0; i < p.n; i++) {
    const h = { time: p.times?.[i] ?? addHours(p.t0, i), isDay: p.isDay[i] === 1 } as Hour;
    for (const k of REQUIRED) h[k] = p.cols[k][i];
    for (const k of OPTIONAL) {
      const v = p.cols[k]?.[i];
      if (v != null) h[k] = v;
    }
    hours.push(h);
  }
  return {
    lat: p.lat,
    lon: p.lon,
    timezone: p.timezone,
    utcOffsetSeconds: p.utcOffsetSeconds,
    hours,
    days: p.days,
    fetchedAt: p.fetchedAt,
    ...(p.source ? { source: p.source } : {}),
  };
}

const isPacked = (x: unknown): x is PackedForecast =>
  typeof x === 'object' && x !== null && (x as PackedForecast).v === PACK_VERSION && typeof (x as PackedForecast).cols === 'object' && (x as PackedForecast).cols !== null;

/** A cut-short copy (a partial write, an edited entry) would fill hours with undefined; better to refetch. */
function complete(p: PackedForecast): boolean {
  const n = p.n;
  const fits = (a: unknown) => Array.isArray(a) && a.length === n;
  return (
    Number.isInteger(n) &&
    n >= 0 &&
    typeof p.t0 === 'string' &&
    Array.isArray(p.days) &&
    fits(p.isDay) &&
    (p.times === undefined || fits(p.times)) &&
    REQUIRED.every((k) => fits(p.cols[k])) &&
    OPTIONAL.every((k) => p.cols[k] === undefined || fits(p.cols[k]))
  );
}

/** Reads either format: columns from this version on, or the one-object-per-hour copies saved before it. Anything else is null. */
export function unpackForecast(raw: unknown): Forecast | null {
  if (isPacked(raw)) return complete(raw) ? unpack(raw) : null;
  const legacy = raw as Forecast | null;
  return legacy && typeof legacy === 'object' && Array.isArray(legacy.hours) ? legacy : null;
}
