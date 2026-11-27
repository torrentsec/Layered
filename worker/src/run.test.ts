// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it, vi } from 'vitest';
import type { Hour } from '../../src/engine';
import type { Forecast } from '../../src/data/forecast-types';
import type { PushPayload, PushProfile, PushSchedule } from '../../src/data/push-api';
import { LONDON } from '../../src/data/metno.fixture';
import { OPEN_METEO_LONDON } from '../../src/data/openmeteo.fixture';
import { FakePushD1 } from '../../functions/_lib/fake-push-d1';
import { fetchForecast, FORECAST_DAYS } from './forecast';
import { changed, parseSummary, planFor, summarise } from './plan';
import { groupByPlace, jobsFor, placeKey, runOnce, type Kind } from './run';
import type { SubscriptionRow } from '../../functions/_lib/push-db';

// Pinned to the bands: these fixtures vary apparent temperature only, which the science engine doesn't read.
// Agreement with the app under both engines is checked in src/state/notify-agree.test.ts.
const PROFILE: PushProfile = {
  engine: 'bands',
  units: { temp: 'c', wind: 'kmh', clock: '24' },
  activity: 'walking',
  manualOffset: 0,
  comfort: { sensitivity: 'average' },
  commute: { enabled: false, out: '08:00', back: '17:30', legHours: 1, days: [1, 2, 3, 4, 5] },
};
const SCHEDULE: PushSchedule = { morning: '07:00', evening: '20:00', days: [1, 2, 3, 4, 5], changeAlerts: true };

function hours(dates: string[], over: (time: string) => Partial<Hour> = () => ({})): Hour[] {
  return dates.flatMap((d) =>
    Array.from({ length: 24 }, (_, h) => {
      const time = `${d}T${String(h).padStart(2, '0')}:00`;
      return { time, temp: 5, feels: 5, precipProb: 0, precip: 0, snow: 0, wind: 10, gusts: 15, uv: 0, isDay: h >= 8 && h < 16, code: 1, ...over(time) };
    }),
  );
}

function forecast(over?: (time: string) => Partial<Hour>): Forecast {
  return { lat: 51.51, lon: -0.13, timezone: 'Europe/London', utcOffsetSeconds: 0, hours: hours(['2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'], over), days: [], fetchedAt: 0 };
}

const rainyLate = (t: string) => (t >= '2026-11-27T09:00' && t < '2026-11-27T12:00' ? { precipProb: 80, precip: 1.2, code: 61 } : {});

function seed(db: FakePushD1, id: string, over: Partial<SubscriptionRow> = {}) {
  db.seed({
    id,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    lat: 51.51,
    lon: -0.13,
    tz: 'Europe/London',
    schedule: JSON.stringify(SCHEDULE),
    profile: JSON.stringify(PROFILE),
    ...over,
  });
}

function harness(f: () => Forecast = () => forecast(), status = 201) {
  const db = new FakePushD1();
  const sent: { id: string; kind: Kind; payload: PushPayload }[] = [];
  const fc = vi.fn(async () => f());
  const deps = (now: string) => ({
    db,
    now: Date.parse(now),
    forecast: fc,
    send: async (row: SubscriptionRow, payload: string, kind: Kind) => {
      sent.push({ id: row.id, kind, payload: JSON.parse(payload) as PushPayload });
      return status;
    },
  });
  return { db, sent, fc, deps };
}

describe('morning and evening pushes', () => {
  it('sends today’s outfit once, from the same engine as the app', async () => {
    const h = harness();
    seed(h.db, 'a');
    const stats = await runOnce(h.deps('2026-11-27T07:00:00Z'));
    expect(stats).toMatchObject({ subscriptions: 1, due: 1, sent: 1 });
    expect(h.sent[0]).toMatchObject({ kind: 'morning', payload: { title: 'What to wear today', tag: 'layered-today', url: '/' } });
    expect(h.sent[0].payload.body).toMatch(/^Coat .*today · dry$/);
    const row = h.db.rows.get('a')!;
    expect(row.last_morning).toBe('2026-11-27');
    expect(parseSummary(row.last_summary)).toMatchObject({ date: '2026-11-27', at: '2026-11-27T07:00', band: 'coat', rain: [] });

    expect((await runOnce(h.deps('2026-11-27T07:10:00Z'))).sent).toBe(0);
    expect(h.sent).toHaveLength(1);
  });

  it('sends tomorrow’s outfit in the evening, worded for tomorrow', async () => {
    const h = harness(() => forecast((t) => (t.startsWith('2026-11-30T1') ? { precipProb: 90, precip: 2, code: 80 } : {})));
    seed(h.db, 'a');
    await runOnce(h.deps('2026-11-29T20:00:00Z'));
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]).toMatchObject({ kind: 'evening', payload: { title: 'What to wear tomorrow', tag: 'layered-evening' } });
    expect(h.sent[0].payload.body).toMatch(/tomorrow · showers from around 10:00$/);
    expect(h.db.rows.get('a')!.last_evening).toBe('2026-11-29');
  });

  it('uses the profile’s clock for times', async () => {
    const h = harness(() => forecast((t) => (t === '2026-11-27T15:00' ? { precipProb: 90, precip: 2, code: 80 } : {})));
    seed(h.db, 'a', { profile: JSON.stringify({ ...PROFILE, units: { ...PROFILE.units, clock: '12' } }) });
    await runOnce(h.deps('2026-11-27T07:00:00Z'));
    expect(h.sent[0].payload.body).toMatch(/from around 3pm$/);
  });
});

describe('grouping', () => {
  it('fetches each rounded place once', async () => {
    const h = harness();
    seed(h.db, 'a');
    seed(h.db, 'b');
    seed(h.db, 'c', { lat: 48.86, lon: 2.35, tz: 'Europe/Paris' });
    // Not due: a different time.
    seed(h.db, 'd', { lat: 40.71, lon: -74.01, tz: 'America/New_York' });
    const stats = await runOnce(h.deps('2026-11-27T07:00:00Z'));
    expect(stats).toMatchObject({ subscriptions: 4, due: 2, places: 1, sent: 2 });
    expect(h.fc).toHaveBeenCalledTimes(1);

    // An hour on, both London rows re-check for changes on a single request.
    h.fc.mockClear();
    await runOnce(h.deps('2026-11-27T08:00:00Z'));
    expect(h.fc).toHaveBeenCalledTimes(1);
    expect(h.fc).toHaveBeenLastCalledWith(51.51, -0.13, 0);
  });

  it('keys places at two decimals', () => {
    expect(placeKey(51.5, -0.1)).toBe('51.50,-0.10');
    const row = { id: 'x', lat: 51.51, lon: -0.13, tz: 'UTC', schedule: JSON.stringify(SCHEDULE), profile: JSON.stringify(PROFILE) } as SubscriptionRow;
    const jobs = [...jobsFor(row, Date.parse('2026-11-27T07:00:00Z')), ...jobsFor({ ...row, id: 'y', lat: 51.52 }, Date.parse('2026-11-27T07:00:00Z'))];
    expect([...groupByPlace(jobs).keys()]).toEqual(['51.51,-0.13', '51.52,-0.13']);
  });

  it('skips rows that no longer parse', () => {
    const row = { id: 'x', lat: 0, lon: 0, tz: 'UTC', schedule: '{', profile: '{}' } as SubscriptionRow;
    expect(jobsFor(row, Date.parse('2026-11-27T07:00:00Z'))).toEqual([]);
    expect(jobsFor({ ...row, schedule: JSON.stringify(SCHEDULE), tz: 'Nowhere/Land' }, Date.parse('2026-11-27T07:00:00Z'))).toEqual([]);
  });
});

describe('change alerts', () => {
  it('alerts once when rain gear changes, replacing the morning notification', async () => {
    let f = forecast();
    const h = harness(() => f);
    seed(h.db, 'a');
    await runOnce(h.deps('2026-11-27T07:00:00Z'));
    expect((await runOnce(h.deps('2026-11-27T08:00:00Z'))).skipped).toBe(1);

    f = forecast(rainyLate);
    await runOnce(h.deps('2026-11-27T09:00:00Z'));
    expect(h.sent.map((s) => s.kind)).toEqual(['morning', 'alert']);
    expect(h.sent[1].payload).toMatchObject({ title: 'Today’s advice has changed', tag: 'layered-today' });
    expect(h.sent[1].payload.body).toMatch(/today · showers from around 09:00$/);
    expect(h.db.rows.get('a')!.last_alert).toBe('2026-11-27');
    expect(parseSummary(h.db.rows.get('a')!.last_summary)!.rain.length).toBeGreaterThan(0);

    f = forecast();
    await runOnce(h.deps('2026-11-27T10:00:00Z'));
    expect(h.sent).toHaveLength(2);
  });

  it('alerts on a band change and ignores the day warming up after the morning window', async () => {
    let f = forecast((t) => (t >= '2026-11-27T13:00' ? { feels: 15 } : {}));
    const h = harness(() => f);
    seed(h.db, 'a');
    await runOnce(h.deps('2026-11-27T07:00:00Z'));
    // At 13:00 the rest of the day is milder, but the morning's window is unchanged.
    expect((await runOnce(h.deps('2026-11-27T13:00:00Z'))).sent).toBe(0);

    f = forecast((t) => (t >= '2026-11-27T07:00' && t < '2026-11-27T12:00' ? { feels: -4 } : {}));
    expect((await runOnce(h.deps('2026-11-27T14:00:00Z'))).sent).toBe(1);
    expect(h.sent[1].kind).toBe('alert');
  });

  it('compares band and rain extras only', () => {
    const plan = planFor(forecast(), '2026-11-27', PROFILE, '2026-11-27T07:00')!;
    const a = summarise(plan.advice, '2026-11-27', '2026-11-27T07:00');
    expect(changed(a, { ...a })).toBe(false);
    expect(changed(a, { ...a, band: 'jacket' })).toBe(true);
    expect(changed(a, { ...a, rain: ['umbrella'] })).toBe(true);
    expect(parseSummary('nope')).toBeNull();
    expect(parseSummary(null)).toBeNull();
  });
});

describe('push service answers', () => {
  it('deletes a subscription the push service no longer knows', async () => {
    for (const status of [404, 410]) {
      const h = harness(undefined, status);
      seed(h.db, 'a');
      expect((await runOnce(h.deps('2026-11-27T07:00:00Z'))).expired).toBe(1);
      expect(h.db.rows.size).toBe(0);
    }
  });

  it('leaves the row unmarked when the push service fails', async () => {
    const h = harness(undefined, 503);
    seed(h.db, 'a');
    expect((await runOnce(h.deps('2026-11-27T07:00:00Z'))).failed).toBe(1);
    expect(h.db.rows.get('a')!.last_morning).toBeNull();
  });

  it('skips a place whose forecast fails without stopping the others', async () => {
    const h = harness();
    h.fc.mockImplementationOnce(async () => {
      throw new Error('both down');
    });
    seed(h.db, 'a');
    seed(h.db, 'b', { lat: 53.48, lon: -2.24 });
    const stats = await runOnce(h.deps('2026-11-27T07:00:00Z'));
    expect(stats).toMatchObject({ failed: 1, sent: 1 });
  });
});

describe('forecast fetch', () => {
  it('asks Open-Meteo for two days', async () => {
    const f = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => Response.json({ latitude: 1, longitude: 2, timezone: 'UTC', utc_offset_seconds: 0, hourly: { time: [] }, daily: { time: [] } }));
    const out = await fetchForecast(51.51, -0.13, 0, f as unknown as typeof fetch, 5);
    expect(String(f.mock.calls[0][0])).toContain(`forecast_days=${FORECAST_DAYS}`);
    expect(out.source).toBe('open-meteo');
  });

  it('gets humidity, cloud and radiation from the same single request', async () => {
    const f = vi.fn(async (_u: string | URL | Request, _i?: RequestInit) => Response.json(OPEN_METEO_LONDON));
    const out = await fetchForecast(51.51, -0.13, 0, f as unknown as typeof fetch, 5);
    expect(f).toHaveBeenCalledTimes(1);
    const hourly = new URL(String(f.mock.calls[0][0])).searchParams.get('hourly')!;
    expect(hourly).toContain('relative_humidity_2m');
    expect(hourly).toContain('direct_normal_irradiance');
    expect(out.hours[3]).toMatchObject({ rh: 82, cloud: 95, ghi: 58, direct: 14, diffuse: 44, dni: 75.3 });
  });

  it('falls back to MET Norway with the local offset', async () => {
    const f = vi.fn(async (u: string | URL | Request, _i?: RequestInit) =>
      String(u).includes('open-meteo') ? new Response('down', { status: 502 }) : Response.json(LONDON),
    );
    const out = await fetchForecast(51.51, -0.13, 3600, f as unknown as typeof fetch, 5);
    expect(out.source).toBe('met-norway');
    expect(out.utcOffsetSeconds).toBe(3600);
    expect(out.hours.length).toBeGreaterThan(24);
    expect(out.hours[0]).toMatchObject({ rh: 84.1, cloud: 60 });
    expect(out.hours[0].ghi).toBeUndefined();
    expect((f.mock.calls[1][1]!.headers as Record<string, string>)['User-Agent']).toMatch(/^Layered\//);
  });

  it('throws when both fail', async () => {
    const f = vi.fn(async () => new Response('down', { status: 500 }));
    await expect(fetchForecast(0, 0, 0, f as unknown as typeof fetch, 5)).rejects.toThrow('MET Norway answered 500');
  });
});
