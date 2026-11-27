// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { METNO_URL, parseMetno, type MetnoResponse } from '../../src/data/metno';
import type { Forecast } from '../../src/data/forecast-types';

/** MET Norway's terms require an identifying User-Agent with a contact route. */
export const USER_AGENT = 'Layered/1.0 (+https://github.com/torrentsec/Layered)';
export const CACHE_SECONDS = 30 * 60;

export interface Query {
  lat: number;
  lon: number;
  tz: string;
}

/** Parsed and range-checked query, or an error message. Coordinates round to 2 dp so nearby users share a cache entry. */
export function parseQuery(params: URLSearchParams): Query | string {
  const rawLat = params.get('lat');
  const rawLon = params.get('lon');
  if (!rawLat || !rawLon) return 'lat and lon are required';
  const lat = Math.round(Number(rawLat) * 100) / 100;
  const lon = Math.round(Number(rawLon) * 100) / 100;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'lat must be between -90 and 90';
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return 'lon must be between -180 and 180';
  const tz = params.get('tz') ?? '';
  return { lat, lon, tz: tz.length <= 64 && offsetFor(tz) !== null ? tz : 'UTC' };
}

/** Current UTC offset of an IANA zone in seconds, or null if the zone is unknown. */
export function offsetFor(tz: string, now = Date.now()): number | null {
  if (!tz) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(now));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((wall - Math.floor(now / 1000) * 1000) / 60_000) * 60;
  } catch {
    return null;
  }
}

interface CacheLike {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, res: Response): Promise<void>;
}

export interface Deps {
  fetch: typeof fetch;
  cache?: CacheLike;
  /** Origin used to build cache keys; the Cache API only accepts http(s) URLs. */
  origin: string;
  now?: number;
}

/**
 * The raw MET Norway document is cached, not the parsed forecast, so callers
 * in different time zones share one upstream request per place.
 */
export async function metnoForecast(q: Query, deps: Deps): Promise<Forecast> {
  const key = new Request(`${deps.origin}/api/forecast/metno?lat=${q.lat.toFixed(2)}&lon=${q.lon.toFixed(2)}`);
  let res = await deps.cache?.match(key);
  if (!res) {
    const upstream = await deps.fetch(`${METNO_URL}?lat=${q.lat.toFixed(2)}&lon=${q.lon.toFixed(2)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!upstream.ok) throw new Error(`MET Norway answered ${upstream.status}`);
    const body = await upstream.text();
    res = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'X-Fetched-At': String(deps.now ?? Date.now()),
      },
    });
    await deps.cache?.put(key, res.clone());
  }
  const fetchedAt = Number(res.headers.get('X-Fetched-At')) || (deps.now ?? Date.now());
  const json = (await res.json()) as MetnoResponse;
  if (!Array.isArray(json?.properties?.timeseries)) throw new Error('MET Norway sent an unexpected document');
  const offset = offsetFor(q.tz, deps.now) ?? 0;
  return { ...parseMetno(json, offset, fetchedAt), lat: q.lat, lon: q.lon, timezone: q.tz };
}

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

// The WebWorker lib's CacheStorage shadows the Workers type, which adds `default`.
const edgeCache = () => (caches as unknown as { default: CacheLike }).default;

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const q = parseQuery(url.searchParams);
  if (typeof q === 'string') return json({ error: q }, 400);
  try {
    // Workers rejects `fetch` called with any receiver but the global, so it
    // can't be handed over as a bare method on the deps object.
    const forecast = await metnoForecast(q, { fetch: (input, init) => fetch(input, init), cache: edgeCache(), origin: url.origin });
    return json(forecast, 200, { 'Cache-Control': 'no-store' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Forecast unavailable' }, 502);
  }
};
