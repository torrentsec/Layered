// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it, vi } from 'vitest';
import { LONDON } from '../../src/data/metno.fixture';
import { metnoForecast, offsetFor, onRequestGet, parseQuery, USER_AGENT } from './forecast';

const params = (q: string) => new URLSearchParams(q);

describe('parseQuery', () => {
  it('rounds coordinates to 2 dp', () => {
    expect(parseQuery(params('lat=51.50735&lon=-0.12776&tz=Europe/London'))).toEqual({ lat: 51.51, lon: -0.13, tz: 'Europe/London' });
  });
  it.each(['lon=1', 'lat=1', 'lat=91&lon=0', 'lat=0&lon=-181', 'lat=abc&lon=0'])('rejects %s', (q) => {
    expect(typeof parseQuery(params(q))).toBe('string');
  });
  it('falls back to UTC for unknown or missing zones', () => {
    expect(parseQuery(params('lat=1&lon=1&tz=Mars/Olympus'))).toMatchObject({ tz: 'UTC' });
    expect(parseQuery(params('lat=1&lon=1'))).toMatchObject({ tz: 'UTC' });
  });
});

describe('offsetFor', () => {
  const winter = Date.parse('2026-01-15T12:00:00Z');
  const summer = Date.parse('2026-07-15T12:00:00Z');
  it('reads standard and summer time', () => {
    expect(offsetFor('Europe/London', winter)).toBe(0);
    expect(offsetFor('Europe/London', summer)).toBe(3600);
    expect(offsetFor('Australia/Sydney', winter)).toBe(39_600);
    expect(offsetFor('Asia/Kolkata', winter)).toBe(19_800);
    expect(offsetFor('America/New_York', winter)).toBe(-18_000);
  });
  it('returns null for unknown zones', () => {
    expect(offsetFor('Nowhere/Special')).toBeNull();
    expect(offsetFor('')).toBeNull();
  });
});

class MemoryCache {
  store = new Map<string, Response>();
  async match(key: Request) {
    return this.store.get(key.url)?.clone();
  }
  async put(key: Request, res: Response) {
    this.store.set(key.url, res);
  }
}

describe('metnoForecast', () => {
  const now = Date.parse('2026-11-26T08:10:00Z');
  const q = { lat: 51.51, lon: -0.13, tz: 'Europe/London' };

  it('asks MET Norway with the required User-Agent and caches the answer', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(LONDON), { status: 200 }));
    const cache = new MemoryCache();
    const deps = { fetch: f as unknown as typeof fetch, cache, origin: 'https://layered.test', now };
    const first = await metnoForecast(q, deps);
    const second = await metnoForecast(q, { ...deps, now: now + 60_000 });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=51.51&lon=-0.13');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(USER_AGENT);
    expect(first).toMatchObject({ source: 'met-norway', timezone: 'Europe/London', utcOffsetSeconds: 0, fetchedAt: now, lat: 51.51, lon: -0.13 });
    expect(second.fetchedAt).toBe(now);
    expect(second.hours.length).toBe(first.hours.length);
  });

  it('throws on an upstream error', async () => {
    const f = vi.fn(async () => new Response('busy', { status: 503 }));
    await expect(metnoForecast(q, { fetch: f as unknown as typeof fetch, origin: 'https://layered.test', now })).rejects.toThrow('503');
  });

  it('throws on an unexpected document', async () => {
    const f = vi.fn(async () => new Response('{"type":"Feature"}', { status: 200 }));
    await expect(metnoForecast(q, { fetch: f as unknown as typeof fetch, origin: 'https://layered.test', now })).rejects.toThrow('unexpected');
  });
});

describe('onRequestGet', () => {
  it('calls fetch with the global receiver, as the Workers runtime requires', async () => {
    // Mirrors the runtime's "Illegal invocation" check that Node doesn't make.
    const strictFetch = vi.fn(function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(new Response(JSON.stringify(LONDON), { status: 200 }));
    });
    vi.stubGlobal('fetch', strictFetch);
    vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
    try {
      const request = new Request('https://layered.test/api/forecast?lat=51.49&lon=0.07&tz=Europe/London');
      const res = await onRequestGet({ request } as unknown as Parameters<typeof onRequestGet>[0]);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { source: string }).source).toBe('met-norway');
      expect(strictFetch).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
