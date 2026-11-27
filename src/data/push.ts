// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { ComfortProfile } from '../engine/comfort';
import { isIosSafari } from './installHint';
import type { Place } from './openmeteo';
import { PUSH_API, type PushKeyResponse, type PushProfile, type PushSchedule, type SubscribeRequest, type SubscribeResponse } from './push-api';
import type { NotifyPrefs, Settings } from './store';

export const DEFAULT_MORNING = '07:00';
export const DEFAULT_EVENING = '20:00';
/** Quiet period after the last change before the subscription is re-posted. */
export const RESUBSCRIBE_DEBOUNCE_MS = 1500;

/** VAPID keys travel as unpadded base64url; `pushManager.subscribe` wants raw bytes. */
export function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Two decimals is about a kilometre: enough for a forecast, too coarse to find a front door. */
export const roundCoord = (n: number): number => Math.round(n * 100) / 100;

export function buildSchedule(n: NotifyPrefs): PushSchedule {
  return {
    morning: n.time || DEFAULT_MORNING,
    evening: n.evening ? n.eveningTime || DEFAULT_EVENING : null,
    days: [...n.days].sort((a, b) => a - b),
    changeAlerts: n.changeAlerts === true,
  };
}

export function buildProfile(s: Settings, comfort: ComfortProfile): PushProfile {
  const c = s.commute;
  return {
    units: s.units,
    activity: s.activity,
    manualOffset: s.manualOffset,
    comfort,
    commute: { enabled: c.enabled, out: c.out, back: c.back, legHours: c.legHours, days: c.days, ...(c.mode ? { mode: c.mode } : {}) },
  };
}

/** Narrows `PushSubscription#toJSON()`, whose keys are optional in the DOM types. */
export function subscriptionKeys(json: PushSubscriptionJSON): SubscribeRequest['subscription'] | null {
  const { endpoint, keys } = json;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return null;
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export interface RequestInput {
  subscription: SubscribeRequest['subscription'];
  place: Pick<Place, 'lat' | 'lon'>;
  tz: string;
  settings: Settings;
  comfort: ComfortProfile;
  id?: string;
}

export function buildSubscribeRequest(i: RequestInput): SubscribeRequest {
  return {
    ...(i.id ? { id: i.id } : {}),
    subscription: i.subscription,
    lat: roundCoord(i.place.lat),
    lon: roundCoord(i.place.lon),
    tz: i.tz,
    schedule: buildSchedule(i.settings.notify),
    profile: buildProfile(i.settings, i.comfort),
  };
}

/**
 * What the server needs to know about, minus the browser's endpoint. When this
 * string changes, the subscription is re-posted; otherwise nothing is sent.
 */
export function requestSignature(r: SubscribeRequest): string {
  const { lat, lon, tz, schedule, profile } = r;
  return JSON.stringify({ lat, lon, tz, schedule, profile });
}

// ---------- support and state ----------

export type Support = 'supported' | 'unsupported' | 'ios-install' | 'ios-update';

export interface SupportEnv {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  userAgent: string;
  maxTouchPoints: number;
  /** Running from the Home Screen (or as an installed app elsewhere). */
  standalone: boolean;
}

export function detectSupport(env: SupportEnv): Support {
  const ios = isIosSafari(env.userAgent, env.maxTouchPoints);
  // Safari on iOS only exposes Web Push to Home Screen apps, so a tab looks unsupported when it isn't.
  if (ios && !env.standalone) return 'ios-install';
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) return 'supported';
  return ios ? 'ios-update' : 'unsupported';
}

export type NotifyStatus = 'unsupported' | 'ios-install' | 'ios-update' | 'off' | 'asking' | 'subscribing' | 'on' | 'disabling' | 'denied' | 'error';

export function initialStatus(support: Support, permission: NotificationPermission | null, n: NotifyPrefs): NotifyStatus {
  if (support !== 'supported') return support;
  if (permission === 'denied') return 'denied';
  return n.enabled && n.subscriptionId && permission === 'granted' ? 'on' : 'off';
}

export type NotifyEvent =
  | { type: 'enable' }
  | { type: 'permission'; result: NotificationPermission }
  | { type: 'subscribed' }
  | { type: 'failed' }
  | { type: 'disable' }
  | { type: 'disabled' };

/** Transitions for the toggle. Anything not listed leaves the state alone. */
export function transition(state: NotifyStatus, e: NotifyEvent): NotifyStatus {
  switch (e.type) {
    case 'enable':
      return state === 'off' || state === 'error' ? 'asking' : state;
    case 'permission':
      if (state !== 'asking') return state;
      return e.result === 'granted' ? 'subscribing' : e.result === 'denied' ? 'denied' : 'off';
    case 'subscribed':
      return state === 'subscribing' ? 'on' : state;
    case 'failed':
      return state === 'subscribing' || state === 'asking' ? 'error' : state === 'disabling' ? 'on' : state;
    case 'disable':
      return state === 'on' || state === 'error' ? 'disabling' : state;
    case 'disabled':
      return state === 'disabling' ? 'off' : state;
  }
}

/** The toggle reads as on only once the server has the subscription. */
export const isChecked = (s: NotifyStatus): boolean => s === 'on' || s === 'disabling';
export const isBusy = (s: NotifyStatus): boolean => s === 'asking' || s === 'subscribing' || s === 'disabling';

// ---------- server ----------

export class PushError extends Error {}

type Fetch = typeof fetch;

async function call(f: Fetch, url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await f(url, { ...init, cache: 'no-store' });
  } catch {
    throw new PushError('Couldn’t reach the server. Check your connection.');
  }
  if (!res.ok && res.status !== 404) throw new PushError('The notification server isn’t working right now. Try again later.');
  return res;
}

export async function fetchKey(f: Fetch = fetch): Promise<Uint8Array<ArrayBuffer>> {
  const res = await call(f, PUSH_API.key);
  const body = res.ok ? ((await res.json().catch(() => null)) as PushKeyResponse | null) : null;
  if (!body || typeof body.publicKey !== 'string' || !body.publicKey) throw new PushError('The notification server isn’t set up yet.');
  return base64UrlToBytes(body.publicKey);
}

/** Returns the server's id, or null when an update names an id the server no longer has. */
export async function postSubscription(req: SubscribeRequest, f: Fetch = fetch): Promise<string | null> {
  const res = await call(f, PUSH_API.subscribe, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.status === 404) {
    if (req.id) return null;
    throw new PushError('The notification server isn’t set up yet.');
  }
  const body = (await res.json().catch(() => null)) as SubscribeResponse | null;
  if (!body || typeof body.id !== 'string' || !body.id) throw new PushError('The notification server sent back something odd.');
  return body.id;
}

export async function deleteSubscription(id: string, f: Fetch = fetch): Promise<void> {
  await call(f, `${PUSH_API.subscription}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Posts, and if the server forgot an old id, starts afresh so the person keeps their notifications. */
export async function saveSubscription(req: SubscribeRequest, f: Fetch = fetch): Promise<string> {
  const id = await postSubscription(req, f);
  if (id) return id;
  const { id: _stale, ...fresh } = req;
  void _stale;
  return (await postSubscription(fresh, f))!;
}

// ---------- browser flow ----------

export interface PushDeps {
  fetch: Fetch;
  /** Must be called straight from the tap, before anything else is awaited. */
  requestPermission: () => Promise<NotificationPermission>;
  registration: () => Promise<Pick<ServiceWorkerRegistration, 'pushManager'>>;
  /** Builds the request once a browser subscription exists; null when there is no place yet. */
  request: (subscription: SubscribeRequest['subscription'], id?: string) => SubscribeRequest | null;
}

export type EnableResult = { ok: true; id: string; signature: string } | { ok: false; reason: 'denied' | 'dismissed' | 'no-place' | 'error'; message?: string };

export async function enablePush(d: PushDeps): Promise<EnableResult> {
  const permission = await d.requestPermission();
  if (permission === 'denied') return { ok: false, reason: 'denied' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };
  let sub: PushSubscription | null = null;
  try {
    const key = await fetchKey(d.fetch);
    const reg = await d.registration();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const keys = subscriptionKeys(sub.toJSON());
    if (!keys) throw new PushError('This browser didn’t give a usable subscription.');
    const req = d.request(keys);
    if (!req) {
      await sub.unsubscribe().catch(() => false);
      return { ok: false, reason: 'no-place' };
    }
    const id = await saveSubscription(req, d.fetch);
    return { ok: true, id, signature: requestSignature(req) };
  } catch (e) {
    // A browser subscription the server never heard of would only confuse the next attempt.
    if (sub) await sub.unsubscribe().catch(() => false);
    return { ok: false, reason: 'error', message: e instanceof PushError ? e.message : 'Couldn’t set up notifications in this browser.' };
  }
}

/** Unsubscribes locally first: even if the server is down, this browser stops receiving. */
export async function disablePush(d: Pick<PushDeps, 'fetch' | 'registration'>, id: string | undefined): Promise<{ ok: boolean; message?: string }> {
  try {
    const reg = await d.registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // No registration or subscription left; the server copy is what matters now.
  }
  if (!id) return { ok: true };
  try {
    await deleteSubscription(id, d.fetch);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Re-posts with the existing id. Returns the id to keep, or null when there is nothing to update. */
export async function updatePush(d: Pick<PushDeps, 'fetch' | 'registration' | 'request'>, id: string): Promise<{ id: string; signature: string } | null> {
  const reg = await d.registration();
  const sub = await reg.pushManager.getSubscription();
  const keys = sub && subscriptionKeys(sub.toJSON());
  if (!keys) return null;
  const req = d.request(keys, id);
  if (!req) return null;
  return { id: await saveSubscription(req, d.fetch), signature: requestSignature(req) };
}

/** Calls `fn` once things have been quiet for `ms`. */
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): ((...a: A) => void) & { cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | undefined;
  const run = (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  return Object.assign(run, { cancel: () => clearTimeout(t) });
}
