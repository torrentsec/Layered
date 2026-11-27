// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMFORT } from '../engine/comfort';
import { PUSH_API, type SubscribeRequest } from './push-api';
import {
  base64UrlToBytes,
  buildProfile,
  buildSchedule,
  buildSubscribeRequest,
  debounce,
  deleteSubscription,
  detectSupport,
  disablePush,
  enablePush,
  fetchKey,
  initialStatus,
  isBusy,
  isChecked,
  postSubscription,
  PushError,
  requestSignature,
  roundCoord,
  subscriptionKeys,
  transition,
  updatePush,
  type NotifyStatus,
  type PushDeps,
  type SupportEnv,
} from './push';
import { DEFAULT_SETTINGS, type Settings } from './store';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const SUB = { endpoint: 'https://push.example/abc', keys: { p256dh: 'pk', auth: 'au' } };

const settingsWith = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...p });

function fakeBrowserSub(json: PushSubscriptionJSON = SUB) {
  return { toJSON: () => json, unsubscribe: vi.fn(async () => true) } as unknown as PushSubscription & { unsubscribe: ReturnType<typeof vi.fn> };
}

/** A stand-in for the /api/push routes as the contract describes them. */
function fakeServer(opts: { key?: string | null; fail?: 'network' | 500; known?: Set<string> } = {}) {
  const known = opts.known ?? new Set<string>();
  let next = 1;
  const bodies: SubscribeRequest[] = [];
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (opts.fail === 'network') throw new TypeError('Failed to fetch');
    if (opts.fail === 500) return new Response('nope', { status: 500 });
    const u = String(url);
    const method = init?.method ?? 'GET';
    if (u === PUSH_API.key) return opts.key === null ? new Response('{}', { status: 404 }) : Response.json({ publicKey: opts.key ?? 'AQID' });
    if (u === PUSH_API.subscribe && method === 'POST') {
      const body = JSON.parse(String(init!.body)) as SubscribeRequest;
      bodies.push(body);
      if (body.id && !known.has(body.id)) return new Response('{}', { status: 404 });
      const id = body.id ?? `s${next++}`;
      known.add(id);
      return Response.json({ id });
    }
    if (u.startsWith(`${PUSH_API.subscription}/`) && method === 'DELETE') {
      known.delete(decodeURIComponent(u.split('/').pop()!));
      return new Response(null, { status: 204 });
    }
    return new Response('{}', { status: 404 });
  });
  return { f: f as unknown as typeof fetch, calls: f, bodies, known };
}

function deps(server: ReturnType<typeof fakeServer>, over: Partial<PushDeps> & { sub?: PushSubscription | null } = {}) {
  const sub = over.sub === undefined ? fakeBrowserSub() : over.sub;
  const pushManager = {
    subscribe: vi.fn(async () => sub!),
    getSubscription: vi.fn(async () => sub),
  };
  const d: PushDeps = {
    fetch: server.f,
    requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
    registration: async () => ({ pushManager }) as unknown as ServiceWorkerRegistration,
    request: (subscription, id) =>
      buildSubscribeRequest({ subscription, place: { lat: 51.5072, lon: -0.1276 }, tz: 'Europe/London', settings: settingsWith(), comfort: DEFAULT_COMFORT, id }),
    ...over,
  };
  return { d, pushManager, sub };
}

describe('base64UrlToBytes', () => {
  it('decodes unpadded base64url', () => {
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3]);
    expect([...base64UrlToBytes('AQ')]).toEqual([1]);
    expect([...base64UrlToBytes('AQI')]).toEqual([1, 2]);
  });

  it('maps - and _ back to + and /', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff]);
  });

  it('round-trips a 65-byte P-256 public key', () => {
    const raw = Uint8Array.from({ length: 65 }, (_, i) => (i * 37 + 4) & 0xff);
    const b64url = btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const out = base64UrlToBytes(b64url);
    expect(out.length).toBe(65);
    expect([...out]).toEqual([...raw]);
  });
});

describe('request building', () => {
  it('rounds coordinates to two decimals', () => {
    expect(roundCoord(51.5072)).toBe(51.51);
    expect(roundCoord(-0.1278)).toBe(-0.13);
    expect(roundCoord(0.005)).toBe(0.01);
  });

  it('schedules mornings only by default', () => {
    expect(buildSchedule(DEFAULT_SETTINGS.notify)).toEqual({ morning: '07:00', evening: null, days: [1, 2, 3, 4, 5], changeAlerts: false });
  });

  it('adds the evening heads-up at 20:00 unless a time is set', () => {
    expect(buildSchedule({ ...DEFAULT_SETTINGS.notify, evening: true }).evening).toBe('20:00');
    expect(buildSchedule({ ...DEFAULT_SETTINGS.notify, evening: true, eveningTime: '21:15' }).evening).toBe('21:15');
    expect(buildSchedule({ ...DEFAULT_SETTINGS.notify, evening: false, eveningTime: '21:15' }).evening).toBeNull();
  });

  it('sorts days so the order they were tapped in does not count as a change', () => {
    expect(buildSchedule({ ...DEFAULT_SETTINGS.notify, days: [0, 3, 1] }).days).toEqual([0, 1, 3]);
  });

  it('passes change alerts through', () => {
    expect(buildSchedule({ ...DEFAULT_SETTINGS.notify, changeAlerts: true }).changeAlerts).toBe(true);
  });

  it('builds the profile from settings and comfort, leaving mode out when unset', () => {
    const p = buildProfile(settingsWith({ activity: 'cycling', manualOffset: -1 }), { sensitivity: 'cold', windTolerance: 'low' });
    expect(p).toEqual({
      units: DEFAULT_SETTINGS.units,
      activity: 'cycling',
      manualOffset: -1,
      comfort: { sensitivity: 'cold', windTolerance: 'low' },
      commute: { enabled: false, out: '08:00', back: '17:30', legHours: 1, days: [1, 2, 3, 4, 5] },
    });
    const withMode = buildProfile(settingsWith({ commute: { ...DEFAULT_SETTINGS.commute, mode: 'transport' } }), DEFAULT_COMFORT);
    expect(withMode.commute.mode).toBe('transport');
  });

  it('builds a full subscribe request, with the id only when updating', () => {
    const base = { subscription: SUB, place: { lat: 51.5072, lon: -0.1276 }, tz: 'Europe/London', settings: settingsWith(), comfort: DEFAULT_COMFORT };
    const fresh = buildSubscribeRequest(base);
    expect(fresh).not.toHaveProperty('id');
    expect(fresh).toMatchObject({ subscription: SUB, lat: 51.51, lon: -0.13, tz: 'Europe/London', schedule: { morning: '07:00' } });
    expect(buildSubscribeRequest({ ...base, id: 's9' }).id).toBe('s9');
  });

  it('keeps real requests well under the server limit', () => {
    const req = buildSubscribeRequest({ subscription: { endpoint: 'https://x/' + 'a'.repeat(400), keys: { p256dh: 'p'.repeat(88), auth: 'a'.repeat(24) } }, place: { lat: 1, lon: 2 }, tz: 'Europe/London', settings: settingsWith(), comfort: DEFAULT_COMFORT, id: 'abc' });
    expect(JSON.stringify(req).length).toBeLessThan(2048);
  });

  it('signs only what the server uses, so a new endpoint alone does not re-post', () => {
    const base = { place: { lat: 51.5072, lon: -0.1276 }, tz: 'Europe/London', settings: settingsWith(), comfort: DEFAULT_COMFORT };
    const a = requestSignature(buildSubscribeRequest({ ...base, subscription: SUB }));
    const b = requestSignature(buildSubscribeRequest({ ...base, subscription: { endpoint: 'other', keys: { p256dh: '', auth: '' } }, id: 'x' }));
    expect(a).toBe(b);
    const moved = requestSignature(buildSubscribeRequest({ ...base, place: { lat: 51.52, lon: -0.1276 }, subscription: SUB }));
    expect(moved).not.toBe(a);
    const nudged = requestSignature(buildSubscribeRequest({ ...base, place: { lat: 51.5051, lon: -0.1276 }, subscription: SUB }));
    expect(nudged).toBe(a);
  });

  it('rejects subscriptions without keys', () => {
    expect(subscriptionKeys(SUB)).toEqual(SUB);
    expect(subscriptionKeys({ endpoint: 'x', keys: { p256dh: 'p' } })).toBeNull();
    expect(subscriptionKeys({ keys: { p256dh: 'p', auth: 'a' } })).toBeNull();
  });
});

describe('support detection', () => {
  const env = (p: Partial<SupportEnv>): SupportEnv => ({
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    userAgent: DESKTOP_CHROME,
    maxTouchPoints: 0,
    standalone: false,
    ...p,
  });

  it('is supported with service worker, PushManager and Notification', () => {
    expect(detectSupport(env({}))).toBe('supported');
  });

  it('is unsupported when any piece is missing', () => {
    expect(detectSupport(env({ hasPushManager: false }))).toBe('unsupported');
    expect(detectSupport(env({ hasServiceWorker: false }))).toBe('unsupported');
    expect(detectSupport(env({ hasNotification: false }))).toBe('unsupported');
  });

  it('asks iOS Safari in a tab to add to the Home Screen first', () => {
    expect(detectSupport(env({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, hasPushManager: false }))).toBe('ios-install');
  });

  it('is supported on iOS from the Home Screen', () => {
    expect(detectSupport(env({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: true }))).toBe('supported');
  });

  it('points older iOS Home Screen apps at the update', () => {
    expect(detectSupport(env({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: true, hasPushManager: false }))).toBe('ios-update');
  });
});

describe('state machine', () => {
  const n = DEFAULT_SETTINGS.notify;

  it('starts from support, permission and saved prefs', () => {
    expect(initialStatus('unsupported', null, n)).toBe('unsupported');
    expect(initialStatus('ios-install', null, n)).toBe('ios-install');
    expect(initialStatus('supported', 'denied', { ...n, enabled: true, subscriptionId: 'x' })).toBe('denied');
    expect(initialStatus('supported', 'granted', { ...n, enabled: true, subscriptionId: 'x' })).toBe('on');
    // Synced or imported prefs without this browser's subscription are not "on" here.
    expect(initialStatus('supported', 'granted', { ...n, enabled: true })).toBe('off');
    expect(initialStatus('supported', 'default', { ...n, enabled: true, subscriptionId: 'x' })).toBe('off');
  });

  it('walks the happy path on and off', () => {
    let s: NotifyStatus = 'off';
    s = transition(s, { type: 'enable' });
    expect(s).toBe('asking');
    s = transition(s, { type: 'permission', result: 'granted' });
    expect(s).toBe('subscribing');
    s = transition(s, { type: 'subscribed' });
    expect(s).toBe('on');
    s = transition(s, { type: 'disable' });
    expect(s).toBe('disabling');
    s = transition(s, { type: 'disabled' });
    expect(s).toBe('off');
  });

  it('handles refusal, dismissal and server errors', () => {
    expect(transition('asking', { type: 'permission', result: 'denied' })).toBe('denied');
    expect(transition('asking', { type: 'permission', result: 'default' })).toBe('off');
    expect(transition('subscribing', { type: 'failed' })).toBe('error');
    expect(transition('error', { type: 'enable' })).toBe('asking');
  });

  it('ignores taps that make no sense in the current state', () => {
    expect(transition('unsupported', { type: 'enable' })).toBe('unsupported');
    expect(transition('denied', { type: 'enable' })).toBe('denied');
    expect(transition('subscribing', { type: 'enable' })).toBe('subscribing');
    expect(transition('off', { type: 'subscribed' })).toBe('off');
  });

  it('shows the box ticked only once the server has it', () => {
    expect(isChecked('subscribing')).toBe(false);
    expect(isChecked('error')).toBe(false);
    expect(isChecked('on')).toBe(true);
    expect(isBusy('asking')).toBe(true);
    expect(isBusy('on')).toBe(false);
  });
});

describe('server calls', () => {
  it('fetches and decodes the VAPID key', async () => {
    const s = fakeServer({ key: 'AQID' });
    expect([...(await fetchKey(s.f))]).toEqual([1, 2, 3]);
    expect(s.calls).toHaveBeenCalledWith(PUSH_API.key, expect.objectContaining({ cache: 'no-store' }));
  });

  it('says so when the key is missing', async () => {
    await expect(fetchKey(fakeServer({ key: null }).f)).rejects.toThrow(PushError);
  });

  it('turns network and server failures into a PushError', async () => {
    await expect(fetchKey(fakeServer({ fail: 'network' }).f)).rejects.toThrow('Couldn’t reach the server');
    await expect(fetchKey(fakeServer({ fail: 500 }).f)).rejects.toThrow('isn’t working right now');
  });

  it('posts JSON and returns the id', async () => {
    const s = fakeServer();
    const req = buildSubscribeRequest({ subscription: SUB, place: { lat: 1, lon: 2 }, tz: 'UTC', settings: settingsWith(), comfort: DEFAULT_COMFORT });
    expect(await postSubscription(req, s.f)).toBe('s1');
    const [url, init] = s.calls.mock.calls[0];
    expect(url).toBe(PUSH_API.subscribe);
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(s.bodies[0]).toEqual(req);
  });

  it('deletes by id', async () => {
    const s = fakeServer({ known: new Set(['a b']) });
    await deleteSubscription('a b', s.f);
    expect(s.calls.mock.calls[0][0]).toBe(`${PUSH_API.subscription}/a%20b`);
    expect(s.known.size).toBe(0);
  });
});

describe('enablePush', () => {
  it('asks permission first, subscribes with the key and stores nothing itself', async () => {
    const s = fakeServer({ key: 'AQID' });
    const { d, pushManager } = deps(s);
    const r = await enablePush(d);
    expect(r).toMatchObject({ ok: true, id: 's1' });
    expect(d.requestPermission).toHaveBeenCalledTimes(1);
    const opts = (pushManager.subscribe.mock.calls[0] as unknown as [PushSubscriptionOptionsInit])[0];
    expect(opts.userVisibleOnly).toBe(true);
    expect([...(opts.applicationServerKey as Uint8Array)]).toEqual([1, 2, 3]);
    expect(s.bodies[0]).toMatchObject({ lat: 51.51, lon: -0.13, tz: 'Europe/London', subscription: SUB });
  });

  it('calls requestPermission synchronously, inside the tap', () => {
    const s = fakeServer();
    const { d } = deps(s);
    void enablePush(d);
    expect(d.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('stops at a refusal without touching the network', async () => {
    const s = fakeServer();
    const { d } = deps(s, { requestPermission: async () => 'denied' });
    expect(await enablePush(d)).toEqual({ ok: false, reason: 'denied' });
    const dismissed = deps(s, { requestPermission: async () => 'default' });
    expect(await enablePush(dismissed.d)).toEqual({ ok: false, reason: 'dismissed' });
    expect(s.calls).not.toHaveBeenCalled();
  });

  it('reports a server error and drops the browser subscription', async () => {
    const s = fakeServer({ fail: 500 });
    const { d } = deps(s);
    const r = await enablePush(d);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
    expect(r.ok === false && r.message).toMatch('isn’t working');
  });

  it('unsubscribes if the post fails after subscribing', async () => {
    const s = fakeServer();
    const sub = fakeBrowserSub();
    const failingPost: typeof fetch = async (url, init) => (String(url) === PUSH_API.subscribe ? new Response('', { status: 503 }) : s.f(url, init));
    const { d } = deps({ ...s, f: failingPost }, { sub });
    expect((await enablePush(d)).ok).toBe(false);
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('gives up cleanly when there is no place', async () => {
    const s = fakeServer();
    const sub = fakeBrowserSub();
    const { d } = deps(s, { sub, request: () => null });
    expect(await enablePush(d)).toEqual({ ok: false, reason: 'no-place' });
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});

describe('updatePush and disablePush', () => {
  it('re-posts with the existing id', async () => {
    const s = fakeServer({ known: new Set(['s7']) });
    const { d } = deps(s);
    expect(await updatePush(d, 's7')).toMatchObject({ id: 's7' });
    expect(s.bodies[0].id).toBe('s7');
  });

  it('starts afresh when the server forgot the id', async () => {
    const s = fakeServer();
    const { d } = deps(s);
    expect(await updatePush(d, 'gone')).toMatchObject({ id: 's1' });
    expect(s.bodies.map((b) => b.id)).toEqual(['gone', undefined]);
  });

  it('does nothing without a browser subscription', async () => {
    const s = fakeServer();
    const { d } = deps(s, { sub: null });
    expect(await updatePush(d, 's1')).toBeNull();
    expect(s.calls).not.toHaveBeenCalled();
  });

  it('unsubscribes in the browser and deletes on the server', async () => {
    const s = fakeServer({ known: new Set(['s3']) });
    const { d, sub } = deps(s);
    expect(await disablePush(d, 's3')).toEqual({ ok: true });
    expect((sub as ReturnType<typeof fakeBrowserSub>).unsubscribe).toHaveBeenCalled();
    expect(s.known.has('s3')).toBe(false);
  });

  it('still unsubscribes locally when the server is down', async () => {
    const s = fakeServer({ fail: 'network' });
    const { d, sub } = deps(s);
    const r = await disablePush(d, 's3');
    expect(r.ok).toBe(false);
    expect((sub as ReturnType<typeof fakeBrowserSub>).unsubscribe).toHaveBeenCalled();
  });
});

describe('debounce', () => {
  afterEach(() => vi.useRealTimers());

  it('runs once with the last arguments after things go quiet', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const run = debounce(fn, 1500);
    run('a');
    vi.advanceTimersByTime(1000);
    run('b');
    vi.advanceTimersByTime(1499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith('b');
  });

  it('can be cancelled', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const run = debounce(fn, 100);
    run();
    run.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});
