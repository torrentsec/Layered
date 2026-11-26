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

export interface ForecastResult {
  forecast: Forecast;
  /** True when the network failed and this is the last good copy. */
  stale: boolean;
}

const inflight = new Map<string, Promise<ForecastResult>>();

/**
 * Fresh copies younger than 15 minutes are served without a request. On a
 * failed request the last good copy is returned and marked stale, so the app
 * can say "Last updated 08:12" rather than going blank.
 */
export function getForecast(lat: number, lon: number, force = false): Promise<ForecastResult> {
  const k = key(lat, lon);
  const cached = cachedForecast(lat, lon);
  if (!force && cached && Date.now() - cached.fetchedAt < FRESH_MS) return Promise.resolve({ forecast: cached, stale: false });
  const running = inflight.get(k);
  if (running) return running;

  const p = fetchForecast(lat, lon)
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
