// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { MAX_SUBSCRIBE_BYTES, PUSH_API, type SubscribeRequest } from '../../src/data/push-api';
import { toB64url } from './b64';
import { FakePushD1 } from './fake-push-d1';
import { handleKey, handleSubscribe, handleUnsubscribe, newPushId } from './push';
import { isPushEndpoint, isPushId, isTimeZone, parseSubscribe } from './push-validate';

const NOW = 1_800_000_000_000;
const P256DH = toB64url(new Uint8Array([4, ...new Array(64).fill(7)]));
const AUTH = toB64url(new Uint8Array(16).fill(9));
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc:def';

function request(over: Record<string, unknown> = {}): SubscribeRequest {
  return {
    subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } },
    lat: 51.50735,
    lon: -0.12776,
    tz: 'Europe/London',
    schedule: { morning: '07:00', evening: null, days: [1, 2, 3, 4, 5], changeAlerts: true },
    profile: {
      units: { temp: 'c', wind: 'kmh', clock: '24' },
      activity: 'walking',
      manualOffset: 0,
      comfort: { sensitivity: 'average' },
      commute: { enabled: false, out: '08:00', back: '17:30', legHours: 1, days: [1, 2, 3, 4, 5] },
    },
    ...over,
  } as SubscribeRequest;
}

let n = 0;
const ids = () => `id${String(++n).padStart(20, '0')}`;

function subscribe(db: FakePushD1 | undefined, body: unknown, opts: { ip?: string; now?: number; raw?: string; method?: string } = {}) {
  const init: RequestInit = { method: opts.method ?? 'POST', body: opts.method === 'GET' ? undefined : (opts.raw ?? JSON.stringify(body)) };
  return handleSubscribe(new Request(`https://layered.test${PUSH_API.subscribe}`, init), { db, ip: opts.ip ?? '203.0.113.7', now: opts.now ?? NOW, newId: ids });
}

function unsubscribe(db: FakePushD1 | undefined, id: string, method = 'DELETE') {
  return handleUnsubscribe(new Request(`https://layered.test${PUSH_API.subscription}/${id}`, { method }), id, { db, ip: '203.0.113.7', now: NOW });
}

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
const parse = (o: unknown) => parseSubscribe(enc(JSON.stringify(o)));

describe('GET /api/push/key', () => {
  it('returns the public key, or 503 without one', async () => {
    const res = handleKey(new Request('https://layered.test/api/push/key'), 'BPUB');
    expect(await res.json()).toEqual({ publicKey: 'BPUB' });
    expect(handleKey(new Request('https://layered.test/api/push/key'), undefined).status).toBe(503);
    expect(handleKey(new Request('https://layered.test/api/push/key'), '').status).toBe(503);
    expect(handleKey(new Request('https://layered.test/api/push/key', { method: 'POST' }), 'BPUB').status).toBe(405);
  });
});

describe('subscribe validation', () => {
  it('accepts a real-shaped request and rounds the place to 2 dp', () => {
    const r = parse(request());
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.body.lat, r.body.lon]).toEqual([51.51, -0.13]);
  });

  it('strips fields the Worker does not need', () => {
    const extra = request();
    (extra.profile as unknown as Record<string, unknown>).name = 'Alex';
    (extra as unknown as Record<string, unknown>).email = 'x@example.com';
    const r = parse(extra);
    expect(r.ok && JSON.stringify(r.body)).not.toMatch(/Alex|example/);
  });

  it('checks sizes: 8 KB by body and by header', async () => {
    const pad = 'a'.repeat(MAX_SUBSCRIBE_BYTES);
    expect(parseSubscribe(enc(JSON.stringify({ ...request(), pad })))).toMatchObject({ ok: false, status: 413 });
    const db = new FakePushD1();
    const declared = new Request('https://layered.test/api/push/subscribe', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Length': String(MAX_SUBSCRIBE_BYTES + 1) },
    });
    expect((await handleSubscribe(declared, { db, ip: '1', now: NOW })).status).toBe(413);
    expect((await subscribe(db, undefined, { raw: JSON.stringify({ ...request(), pad }) })).status).toBe(413);
    expect(db.rows.size).toBe(0);
  });

  it.each([
    ['not JSON', 'nope'],
    ['an array', '[]'],
  ])('rejects %s', (_, raw) => {
    expect(parseSubscribe(enc(raw))).toMatchObject({ ok: false, status: 400 });
  });

  it.each<[string, Record<string, unknown>]>([
    ['a bad id', { id: 'short' }],
    ['plain http', { subscription: { endpoint: 'http://fcm.googleapis.com/x', keys: { p256dh: P256DH, auth: AUTH } } }],
    ['an unknown push host', { subscription: { endpoint: 'https://evil.example/x', keys: { p256dh: P256DH, auth: AUTH } } }],
    ['a look-alike host', { subscription: { endpoint: 'https://fcm.googleapis.com.evil.example/x', keys: { p256dh: P256DH, auth: AUTH } } }],
    ['a short p256dh', { subscription: { endpoint: ENDPOINT, keys: { p256dh: AUTH, auth: AUTH } } }],
    ['a compressed p256dh', { subscription: { endpoint: ENDPOINT, keys: { p256dh: toB64url(new Uint8Array(65).fill(3)), auth: AUTH } } }],
    ['a long auth', { subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: P256DH } } }],
    ['lat over 90', { lat: 90.5 }],
    ['lon as a string', { lon: '0' }],
    ['an unknown zone', { tz: 'Mars/Olympus' }],
    ['an empty zone', { tz: '' }],
    ['a 24:00 morning', { schedule: { morning: '24:00', evening: null, days: [1], changeAlerts: false } }],
    ['a 7:00 morning', { schedule: { morning: '7:00', evening: null, days: [1], changeAlerts: false } }],
    ['no times at all', { schedule: { morning: null, evening: null, days: [1], changeAlerts: false } }],
    ['day 7', { schedule: { morning: '07:00', evening: null, days: [7], changeAlerts: false } }],
    ['fractional days', { schedule: { morning: '07:00', evening: null, days: [1.5], changeAlerts: false } }],
    ['a missing changeAlerts', { schedule: { morning: '07:00', evening: null, days: [1] } }],
  ])('rejects %s', (_, over) => {
    expect(parse(request(over))).toMatchObject({ ok: false, status: 400 });
  });

  it.each<[string, (p: Record<string, unknown>) => void]>([
    ['an unknown activity', (p) => (p.activity = 'sleeping')],
    ['a wild manual offset', (p) => (p.manualOffset = 40)],
    ['a bad unit', (p) => (p.units = { temp: 'k', wind: 'kmh', clock: '24' })],
    ['a bad sensitivity', (p) => (p.comfort = { sensitivity: 'hot' })],
    ['a bad tolerance', (p) => (p.comfort = { sensitivity: 'cold', windTolerance: 'extreme' })],
    ['a bad commute time', (p) => (p.commute = { enabled: true, out: '8am', back: '17:30', legHours: 1, days: [1] })],
    ['a zero leg', (p) => (p.commute = { enabled: true, out: '08:00', back: '17:30', legHours: 0, days: [1] })],
  ])('rejects a profile with %s', (_, mutate) => {
    const r = request();
    mutate(r.profile as unknown as Record<string, unknown>);
    expect(parse(r)).toMatchObject({ ok: false, status: 400 });
  });

  it('accepts every major push service and an evening-only schedule', () => {
    for (const e of [
      'https://fcm.googleapis.com/fcm/send/x',
      'https://updates.push.services.mozilla.com/wpush/v2/x',
      'https://web.push.apple.com/x',
      'https://wns2-par02p.notify.windows.com/w/?token=x',
    ]) {
      expect(isPushEndpoint(e)).toBe(true);
    }
    expect(isPushEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isPushEndpoint('https://user:pw@fcm.googleapis.com/x')).toBe(false);
    expect(parse(request({ schedule: { morning: null, evening: '20:30', days: [0, 6, 6], changeAlerts: false } }))).toMatchObject({
      ok: true,
      body: { schedule: { days: [0, 6] } },
    });
  });

  it('knows ids and zones', () => {
    expect(isPushId(newPushId())).toBe(true);
    expect(isPushId('a'.repeat(21))).toBe(false);
    expect(isPushId('a'.repeat(21) + '/')).toBe(false);
    expect(isTimeZone('America/New_York')).toBe(true);
    expect(isTimeZone('Asia/Kathmandu')).toBe(true);
    expect(isTimeZone('Europe/Lndon')).toBe(false);
    expect(isTimeZone('x'.repeat(65))).toBe(false);
  });
});

describe('POST /api/push/subscribe', () => {
  it('stores a subscription and returns its id', async () => {
    const db = new FakePushD1();
    const res = await subscribe(db, request());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const { id } = (await res.json()) as { id: string };
    const row = db.rows.get(id)!;
    expect(row).toMatchObject({ endpoint: ENDPOINT, lat: 51.51, lon: -0.13, tz: 'Europe/London', created_at: NOW });
    expect(JSON.parse(row.schedule)).toEqual(request().schedule);
  });

  it('updates by id, keeping the row and what it has sent', async () => {
    const db = new FakePushD1();
    const { id } = (await (await subscribe(db, request())).json()) as { id: string };
    db.rows.set(id, { ...db.rows.get(id)!, last_morning: '2027-01-15' });
    const moved = request({ id, subscription: { endpoint: `${ENDPOINT}2`, keys: { p256dh: P256DH, auth: AUTH } }, tz: 'Europe/Paris' });
    const again = (await (await subscribe(db, moved, { now: NOW + 1 })).json()) as { id: string };
    expect(again.id).toBe(id);
    expect(db.rows.size).toBe(1);
    expect(db.rows.get(id)).toMatchObject({ endpoint: `${ENDPOINT}2`, tz: 'Europe/Paris', last_morning: '2027-01-15', created_at: NOW, updated_at: NOW + 1 });
  });

  it('updates by endpoint when the app has lost its id', async () => {
    const db = new FakePushD1();
    const first = (await (await subscribe(db, request())).json()) as { id: string };
    const second = (await (await subscribe(db, request({ lat: 48.85 }))).json()) as { id: string };
    expect(second.id).toBe(first.id);
    expect(db.rows.size).toBe(1);
    expect(db.rows.get(first.id)!.lat).toBe(48.85);
  });

  it('treats an unknown id as new and drops a stale row on the same endpoint', async () => {
    const db = new FakePushD1();
    db.seed({ id: 'stale0000000000000000a', endpoint: `${ENDPOINT}9` });
    const first = (await (await subscribe(db, request())).json()) as { id: string };
    // The browser rotated its endpoint onto one another row still holds.
    const moved = request({ id: first.id, subscription: { endpoint: `${ENDPOINT}9`, keys: { p256dh: P256DH, auth: AUTH } } });
    expect((await subscribe(db, moved)).status).toBe(200);
    expect([...db.rows.keys()]).toEqual([first.id]);

    const ghost = (await (await subscribe(db, request({ id: 'ghost00000000000000000', subscription: { endpoint: `${ENDPOINT}x`, keys: { p256dh: P256DH, auth: AUTH } } }))).json()) as { id: string };
    expect(ghost.id).not.toBe('ghost00000000000000000');
    expect(db.rows.size).toBe(2);
  });

  it('rejects bad bodies, other methods and a missing database', async () => {
    const db = new FakePushD1();
    expect((await subscribe(db, request({ tz: 'Nowhere/Land' }))).status).toBe(400);
    const get = await subscribe(db, undefined, { method: 'GET' });
    expect(get.status).toBe(405);
    expect(get.headers.get('Allow')).toBe('POST');
    expect((await subscribe(undefined, request())).status).toBe(503);
    expect(db.rows.size).toBe(0);
  });

  it('allows 30 writes per address per hour, never storing the address', async () => {
    const db = new FakePushD1();
    for (let i = 0; i < 30; i++) expect((await subscribe(db, request())).status).toBe(200);
    const over = await subscribe(db, request());
    expect(over.status).toBe(429);
    expect(Number(over.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await unsubscribe(db, [...db.rows.keys()][0])).status).toBe(429);
    expect((await subscribe(db, request(), { ip: '198.51.100.2' })).status).toBe(200);
    expect([...db.limits.keys()].some((k) => k.includes('203.0.113.7'))).toBe(false);
  });
});

describe('DELETE /api/push/:id', () => {
  it('deletes once, then 404', async () => {
    const db = new FakePushD1();
    const { id } = (await (await subscribe(db, request())).json()) as { id: string };
    expect((await unsubscribe(db, id)).status).toBe(204);
    expect(db.rows.size).toBe(0);
    expect((await unsubscribe(db, id)).status).toBe(404);
  });

  it('rejects bad ids and other methods', async () => {
    const db = new FakePushD1();
    expect((await unsubscribe(db, '../etc')).status).toBe(400);
    expect((await unsubscribe(db, newPushId(), 'GET')).status).toBe(405);
    expect((await unsubscribe(undefined, newPushId())).status).toBe(503);
  });
});
