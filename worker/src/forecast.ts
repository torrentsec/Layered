// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { forecastUrl, parseForecast, type Forecast } from '../../src/data/forecast-types';
import { METNO_URL, parseMetno, type MetnoResponse } from '../../src/data/metno';
import { USER_AGENT } from '../../functions/api/forecast';

/** Today and tomorrow are all a notification needs. */
export const FORECAST_DAYS = 2;

/** Open-Meteo first, as in the app; MET Norway if it fails, so one provider's outage doesn't silence the morning. */
export async function fetchForecast(lat: number, lon: number, offsetSeconds: number, f: typeof fetch, now: number): Promise<Forecast> {
  try {
    const res = await f(forecastUrl(lat, lon, FORECAST_DAYS), { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
    return parseForecast((await res.json()) as Parameters<typeof parseForecast>[0], now);
  } catch (first) {
    const res = await f(`${METNO_URL}?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${first instanceof Error ? first.message : 'Open-Meteo failed'}; MET Norway answered ${res.status}`, { cause: first });
    const json = (await res.json()) as MetnoResponse;
    if (!Array.isArray(json?.properties?.timeseries)) throw new Error('MET Norway sent an unexpected document', { cause: first });
    return { ...parseMetno(json, offsetSeconds, now), lat, lon };
  }
}
