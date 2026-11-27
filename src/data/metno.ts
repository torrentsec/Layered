// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Hour } from '../engine/types';
import type { DayInfo, Forecast } from './forecast-types';

export const METNO_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';

/** Days of hourly rows to keep; MET Norway's tail beyond this is too coarse to plan clothes on. */
export const METNO_DAYS = 9;

interface Period {
  summary?: { symbol_code?: string };
  details?: { precipitation_amount?: number; probability_of_precipitation?: number };
}

export interface MetnoStep {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature?: number;
        relative_humidity?: number;
        wind_speed?: number;
        wind_speed_of_gust?: number;
        ultraviolet_index_clear_sky?: number;
      };
    };
    next_1_hours?: Period;
    next_6_hours?: Period;
    next_12_hours?: Period;
  };
}

export interface MetnoResponse {
  geometry?: { coordinates?: number[] };
  properties: { timeseries: MetnoStep[] };
}

const HOUR_MS = 3_600_000;
const MS_TO_KMH = 3.6;
/** Typical gust-to-mean ratio over land, used where MET Norway has no gust field (outside the Nordics). */
const GUST_FACTOR = 1.5;

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Australian apparent temperature (Steadman, as used by the Bureau of
 * Meteorology): ws in m/s, rh in percent. Open-Meteo's own feels-like uses the
 * same formula, so switching provider doesn't shift the advice.
 */
export function apparentTemp(ta: number, rh: number, ws: number): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * ta) / (237.7 + ta));
  return ta + 0.33 * e - 0.7 * ws - 4.0;
}

const SYMBOL_CODES: Record<string, number> = {
  clearsky: 0,
  fair: 1,
  partlycloudy: 2,
  cloudy: 3,
  fog: 45,
  lightrain: 61,
  rain: 63,
  heavyrain: 65,
  lightsleet: 66,
  sleet: 67,
  heavysleet: 67,
  lightsnow: 71,
  snow: 73,
  heavysnow: 75,
  lightrainshowers: 80,
  rainshowers: 81,
  heavyrainshowers: 82,
  lightsleetshowers: 80,
  sleetshowers: 81,
  heavysleetshowers: 82,
  lightsnowshowers: 85,
  snowshowers: 85,
  heavysnowshowers: 86,
};

/** MET Norway symbol (e.g. "lightrainshowers_day") → WMO weather code the engine reads. */
export function symbolToCode(symbol: string | undefined): number {
  const base = (symbol ?? '').replace(/_(day|night|polartwilight)$/, '');
  if (base.includes('thunder')) return base.includes('heavy') ? 96 : 95;
  return SYMBOL_CODES[base] ?? 3;
}

const isSnowy = (symbol: string | undefined) => /snow/.test(symbol ?? '');

/** Rough chance of precipitation from the forecast amount, for regions where MET Norway gives no probability. */
export function probFromAmount(mmPerHour: number): number {
  if (mmPerHour >= 1) return 80;
  if (mmPerHour >= 0.5) return 60;
  if (mmPerHour >= 0.2) return 40;
  if (mmPerHour > 0) return 20;
  return 0;
}

const localIso = (utcMs: number, offset: number) => new Date(utcMs + offset * 1000).toISOString().slice(0, 16);

interface Slice {
  symbol?: string;
  mmPerHour: number;
  prob?: number;
}

/**
 * The precipitation period covering the k-th hour after a step, spread evenly
 * per hour: the 1-hour period for the step's own hour, else the 6- or 12-hour
 * period it falls in.
 */
export function sliceAt(step: MetnoStep, k: number): Slice {
  const d = step.data;
  const pick = (p: Period, span: number): Slice => ({
    symbol: p.summary?.symbol_code,
    mmPerHour: num(p.details?.precipitation_amount) / span,
    prob: p.details?.probability_of_precipitation,
  });
  if (k === 0 && d.next_1_hours) return pick(d.next_1_hours, 1);
  if (k < 6 && d.next_6_hours) return pick(d.next_6_hours, 6);
  if (k < 12 && d.next_12_hours) return pick(d.next_12_hours, 12);
  const any = d.next_1_hours ?? d.next_6_hours ?? d.next_12_hours;
  return { symbol: any?.summary?.symbol_code, mmPerHour: 0, prob: 0 };
}

function buildHour(time: string, ta: number, rh: number, ws: number, gust: number, uv: number, s: Slice): Hour {
  const suffix = s.symbol?.match(/_(day|night|polartwilight)$/)?.[1];
  const hr = Number(time.slice(11, 13));
  return {
    time,
    temp: round1(ta),
    feels: round1(apparentTemp(ta, rh, ws)),
    precipProb: Math.round(s.prob ?? probFromAmount(s.mmPerHour)),
    precip: Math.round(s.mmPerHour * 100) / 100,
    // Snowfall in cm, from water equivalent at the usual 0.7 ratio Open-Meteo uses.
    snow: isSnowy(s.symbol) ? round1(s.mmPerHour * 0.7) : 0,
    wind: round1(ws * MS_TO_KMH),
    gusts: round1(gust * MS_TO_KMH),
    uv: round1(uv),
    isDay: suffix ? suffix === 'day' : hr >= 6 && hr < 18,
    code: symbolToCode(s.symbol),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * MET Norway steps are hourly for about two days, then six-hourly. The engine
 * expects one row per hour, so the coarse tail is filled in: instant values
 * are interpolated towards the next step and the period's rain is spread
 * evenly across its hours.
 */
export function parseMetno(json: MetnoResponse, utcOffsetSeconds: number, fetchedAt = Date.now()): Forecast {
  const steps = json.properties.timeseries;
  const hours: Hour[] = [];
  const firstDate = steps.length ? localIso(Date.parse(steps[0].time), utcOffsetSeconds).slice(0, 10) : '';
  const lastDate = firstDate ? localIso(Date.parse(`${firstDate}T00:00:00Z`) + (METNO_DAYS - 1) * 24 * HOUR_MS, 0).slice(0, 10) : '';

  steps.forEach((step, i) => {
    const t0 = Date.parse(step.time);
    const next = steps[i + 1];
    const t1 = next ? Date.parse(next.time) : t0 + HOUR_MS;
    const cur = step.data.instant.details;
    const nxt = next?.data.instant.details ?? cur;
    const span = Math.max(1, Math.round((t1 - t0) / HOUR_MS));
    for (let k = 0; k < span; k++) {
      const time = localIso(t0 + k * HOUR_MS, utcOffsetSeconds);
      if (time.slice(0, 10) > lastDate) return;
      const f = k / span;
      const ta = lerp(num(cur.air_temperature), num(nxt.air_temperature, num(cur.air_temperature)), f);
      const rh = lerp(num(cur.relative_humidity, 70), num(nxt.relative_humidity, num(cur.relative_humidity, 70)), f);
      const ws = lerp(num(cur.wind_speed), num(nxt.wind_speed, num(cur.wind_speed)), f);
      const g0 = num(cur.wind_speed_of_gust, num(cur.wind_speed) * GUST_FACTOR);
      const g1 = num(nxt.wind_speed_of_gust, num(nxt.wind_speed, num(cur.wind_speed)) * GUST_FACTOR);
      const uv = lerp(num(cur.ultraviolet_index_clear_sky), num(nxt.ultraviolet_index_clear_sky, num(cur.ultraviolet_index_clear_sky)), f);
      hours.push(buildHour(time, ta, rh, ws, lerp(g0, g1, f), uv, sliceAt(step, k)));
    }
  });

  return {
    lat: num(json.geometry?.coordinates?.[1]),
    lon: num(json.geometry?.coordinates?.[0]),
    timezone: '',
    utcOffsetSeconds,
    hours,
    days: dailyFrom(hours),
    fetchedAt,
    source: 'met-norway',
  };
}

/** Daily summary from the hourly rows. The worst weather code wins, as with Open-Meteo's daily code. */
export function dailyFrom(hours: Hour[]): DayInfo[] {
  const byDate = new Map<string, Hour[]>();
  for (const h of hours) {
    const d = h.time.slice(0, 10);
    byDate.set(d, [...(byDate.get(d) ?? []), h]);
  }
  return [...byDate].map(([date, hs]) => {
    const max = (k: keyof Hour) => Math.max(...hs.map((h) => h[k] as number));
    const min = (k: keyof Hour) => Math.min(...hs.map((h) => h[k] as number));
    return {
      date,
      sunrise: '',
      sunset: '',
      tempMax: max('temp'),
      tempMin: min('temp'),
      feelsMax: max('feels'),
      feelsMin: min('feels'),
      precipProbMax: max('precipProb'),
      precipSum: round1(hs.reduce((a, h) => a + h.precip, 0)),
      uvMax: max('uv'),
      gustMax: max('gusts'),
      code: max('code'),
    };
  });
}
