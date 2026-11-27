// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { fetchForecast, type Forecast } from './forecast-types';

export const FRESH_MS = 15 * 60 * 1000;
const key = (lat: number, lon: number) => `layered:fc:${lat.toFixed(2)},${lon.toFixed(2)}`;

export function cachedForecast(lat: number, lon: number): Forecast | null {
  try {
    const raw = localStorage.getItem(key(lat, lon));
    return raw ? (JSON.parse(raw) as Forecast) : null;
  } catch {
    return null;
  }
}

/** Our MET Norway proxy, tried when Open-Meteo is down. */
export async function fetchFallback(lat: number, lon: number, tz: string, f: typeof fetch = fetch): Promise<Forecast> {
  const q = new URLSearchParams({ lat: lat.toFixed(2), lon: lon.toFixed(2), tz });
  const res = await f(`/api/forecast?${q}`);
  if (!res.ok) throw new Error(`Fallback forecast unavailable (${res.status})`);
  const forecast = (await res.json()) as Forecast;
  if (!Array.isArray(forecast?.hours) || !forecast.hours.length) throw new Error('Fallback forecast was empty');
  return forecast;
}

/** The place's own zone when we've seen it before, else the device's, so local hours line up. */
const zoneFor = (cached: Forecast | null) =>
  cached?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export interface ForecastResult {
  forecast: Forecast;
  /** True when the network failed and this is the last good copy. */
  stale: boolean;
}

const inflight = new Map<string, Promise<ForecastResult>>();

/**
 * Fresh copies younger than 15 minutes are served without a request. On a
 * failed request the last good copy is returned and marked stale, so the app
 * can say "Last updated 08:12" rather than going blank. MET Norway is tried
 * before settling for the stale copy.
 */
export function getForecast(lat: number, lon: number, force = false): Promise<ForecastResult> {
  const k = key(lat, lon);
  const cached = cachedForecast(lat, lon);
  if (!force && cached && Date.now() - cached.fetchedAt < FRESH_MS) return Promise.resolve({ forecast: cached, stale: false });
  const running = inflight.get(k);
  if (running) return running;

  const p = fetchForecast(lat, lon)
    .catch(() => fetchFallback(lat, lon, zoneFor(cached)))
    .then((forecast) => {
      try {
        localStorage.setItem(k, JSON.stringify(forecast));
      } catch {
        // Storage full or blocked; the in-memory copy still works this session.
      }
      return { forecast, stale: false };
    })
    .catch((err: unknown) => {
      if (cached) return { forecast: cached, stale: true };
      throw err;
    })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
