// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Hour } from '../engine/types';

export interface DayInfo {
  date: string;
  sunrise: string;
  sunset: string;
  tempMax: number;
  tempMin: number;
  feelsMax: number;
  feelsMin: number;
  precipProbMax: number;
  precipSum: number;
  uvMax: number;
  gustMax: number;
  code: number;
}

export interface Forecast {
  lat: number;
  lon: number;
  timezone: string;
  utcOffsetSeconds: number;
  hours: Hour[];
  days: DayInfo[];
  fetchedAt: number;
  /** Which provider answered; absent on copies saved before the fallback existed. */
  source?: 'open-meteo' | 'met-norway';
}

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'snowfall',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'is_day',
  'visibility',
] as const;

export const DAILY_VARS = [
  'sunrise',
  'sunset',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
  'wind_gusts_10m_max',
  'weather_code',
] as const;

export function forecastUrl(lat: number, lon: number, days = 16): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(days),
    wind_speed_unit: 'kmh',
  });
  return `${FORECAST_URL}?${q}`;
}

type Series = Record<string, (number | string | null)[]>;

interface RawForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  hourly: Series & { time: string[] };
  daily: Series & { time: string[] };
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Open-Meteo's column arrays → rows. Gaps (nulls) become safe defaults. */
export function parseForecast(raw: RawForecast, fetchedAt = Date.now()): Forecast {
  const h = raw.hourly;
  const hours: Hour[] = h.time.map((time, i) => {
    const temp = num(h.temperature_2m[i]);
    return {
      time,
      temp,
      feels: num(h.apparent_temperature[i], temp),
      precipProb: num(h.precipitation_probability[i]),
      precip: num(h.precipitation[i]),
      snow: num(h.snowfall[i]),
      wind: num(h.wind_speed_10m[i]),
      gusts: num(h.wind_gusts_10m[i]),
      uv: num(h.uv_index[i]),
      isDay: h.is_day[i] === 1,
      code: num(h.weather_code[i]),
      visibility: h.visibility?.[i] == null ? undefined : num(h.visibility[i]),
    };
  });
  const d = raw.daily;
  const days: DayInfo[] = d.time.map((date, i) => ({
    date,
    sunrise: String(d.sunrise[i] ?? ''),
    sunset: String(d.sunset[i] ?? ''),
    tempMax: num(d.temperature_2m_max[i]),
    tempMin: num(d.temperature_2m_min[i]),
    feelsMax: num(d.apparent_temperature_max[i]),
    feelsMin: num(d.apparent_temperature_min[i]),
    precipProbMax: num(d.precipitation_probability_max[i]),
    precipSum: num(d.precipitation_sum[i]),
    uvMax: num(d.uv_index_max[i]),
    gustMax: num(d.wind_gusts_10m_max[i]),
    code: num(d.weather_code[i]),
  }));
  return {
    lat: raw.latitude,
    lon: raw.longitude,
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    hours,
    days,
    fetchedAt,
    source: 'open-meteo',
  };
}

export async function fetchForecast(lat: number, lon: number, f: typeof fetch = fetch): Promise<Forecast> {
  const res = await f(forecastUrl(lat, lon));
  if (!res.ok) throw new Error(`Forecast unavailable (${res.status})`);
  return parseForecast((await res.json()) as RawForecast);
}
