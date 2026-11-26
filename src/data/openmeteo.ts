// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { AirSample } from '../engine/air';
import type { Hour } from '../engine/types';

export interface Place {
  id: string;
  name: string;
  /** Region/country line under the name. */
  detail?: string;
  lat: number;
  lon: number;
  kind?: 'home' | 'work' | 'gym' | 'custom' | 'here';
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`, { signal });
  if (!res.ok) throw new Error('Place search is unavailable right now');
  const json = (await res.json()) as {
    results?: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (json.results ?? []).map((r) => ({
    id: `geo-${r.id}`,
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Today's peak pollen and AQI for the place, read from the air-quality API's hourly series. */
export async function fetchAir(lat: number, lon: number, date: string): Promise<AirSample> {
  const q = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    hourly: 'european_aqi,pm2_5,grass_pollen,birch_pollen,alder_pollen,olive_pollen,mugwort_pollen,ragweed_pollen',
    timezone: 'auto',
    forecast_days: '2',
  });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}`);
  if (!res.ok) throw new Error('Air quality unavailable');
  const json = (await res.json()) as { hourly: Record<string, (number | null)[]> & { time: string[] } };
  const h = json.hourly;
  const idx = h.time.map((t, i) => (t.startsWith(date) ? i : -1)).filter((i) => i >= 0);
  const peak = (...keys: string[]): number | undefined => {
    let best: number | undefined;
    for (const k of keys) {
      for (const i of idx) {
        const v = h[k]?.[i];
        if (typeof v === 'number') best = Math.max(best ?? 0, v);
      }
    }
    return best;
  };
  return {
    grass: peak('grass_pollen'),
    tree: peak('birch_pollen', 'alder_pollen', 'olive_pollen'),
    weed: peak('mugwort_pollen', 'ragweed_pollen'),
    aqi: peak('european_aqi'),
    pm25: peak('pm2_5'),
  };
}

export interface TypicalDay {
  date: string;
  hours: Hour[];
}

const YEARS_BACK = 5;

const shiftYears = (d: string, y: number) => `${Number(d.slice(0, 4)) - y}${d.slice(4)}`;

/**
 * "Typical weather" for dates beyond the forecast horizon: the same calendar
 * dates over the last five years from the historical archive, averaged, then
 * shaped into a day the engine can read like a forecast. One request spans all
 * five years; the free API rate-limits bursts of parallel calls.
 */
export async function fetchTypical(lat: number, lon: number, dates: string[]): Promise<TypicalDay[]> {
  if (!dates.length) return [];
  const q = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    start_date: shiftYears(dates[0], YEARS_BACK),
    end_date: shiftYears(dates[dates.length - 1], 1),
    daily: 'apparent_temperature_max,apparent_temperature_min,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,snowfall_sum',
    timezone: 'auto',
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${q}`);
  if (!res.ok) throw new Error('Typical weather is unavailable right now');
  const daily = ((await res.json()) as { daily: Record<string, (number | null)[]> & { time: string[] } }).daily;
  return typicalFromArchive(daily, dates);
}

/** Averages archive rows that share each target date's month and day. */
export function typicalFromArchive(daily: Record<string, (number | null)[]> & { time: string[] }, dates: string[]): TypicalDay[] {
  const rowsByMonthDay = new Map<string, number[]>();
  daily.time.forEach((t, i) => {
    const md = t.slice(5);
    rowsByMonthDay.set(md, [...(rowsByMonthDay.get(md) ?? []), i]);
  });
  return dates.flatMap((date) => {
    const rows = rowsByMonthDay.get(date.slice(5)) ?? rowsByMonthDay.get('02-28') ?? [];
    if (!rows.length) return [];
    const avg = (k: string) => {
      const vals = rows.map((i) => daily[k]?.[i]).filter((v): v is number => typeof v === 'number');
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const wetShare = rows.filter((i) => (daily.precipitation_sum?.[i] ?? 0) >= 1).length / rows.length;
    return [
      {
        date,
        hours: synthDay(date, avg('apparent_temperature_min'), avg('apparent_temperature_max'), avg('temperature_2m_min'), avg('temperature_2m_max'), {
          prob: Math.round(wetShare * 100),
          mm: avg('precipitation_sum'),
          gusts: avg('wind_gusts_10m_max'),
          snow: avg('snowfall_sum') > 0.5,
        }),
      },
    ];
  });
}

/**
 * Hours 07–23 shaped like a real day: a cosine rise from the early-morning low
 * to a 15:00 high, then a slower fall through the evening, so a night out on
 * a typical day reads colder than the afternoon.
 */
export function synthDay(
  date: string,
  feelsMin: number,
  feelsMax: number,
  tMin: number,
  tMax: number,
  x: { prob: number; mm: number; gusts: number; snow: boolean },
): Hour[] {
  const shape = (hr: number) =>
    hr <= 15 ? 0.5 - 0.5 * Math.cos((Math.PI * Math.max(0, hr - 6)) / 9) : 0.5 + 0.5 * Math.cos((Math.PI * (hr - 15)) / 15);
  return Array.from({ length: 17 }, (_, i) => {
    const hr = 7 + i;
    const f = shape(hr);
    return {
      time: `${date}T${String(hr).padStart(2, '0')}:00`,
      temp: tMin + (tMax - tMin) * f,
      feels: feelsMin + (feelsMax - feelsMin) * f,
      precipProb: x.prob,
      precip: x.mm / 17,
      snow: x.snow ? 0.1 : 0,
      wind: x.gusts / 2,
      gusts: x.gusts,
      uv: 0,
      isDay: hr >= 8 && hr < 17,
      code: x.snow ? 73 : x.prob >= 50 ? 61 : 2,
    };
  });
}
