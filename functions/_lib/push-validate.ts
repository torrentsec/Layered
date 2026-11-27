// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { LearnSnapshot } from '../../src/engine/learning';
import type { Activity, Effort } from '../../src/engine/types';
import type { PushProfile, PushRoutine, PushSchedule, SubscribeRequest } from '../../src/data/push-api';
import { MAX_PUSH_ROUTINES, MAX_SUBSCRIBE_BYTES } from '../../src/data/push-api';
import { fromB64url } from './b64';

export const ACTIVITIES: readonly Activity[] = ['walking', 'standing', 'cycling', 'transport', 'running', 'hiking', 'night', 'office', 'indoors'];

/**
 * Push services the major browsers use. The Worker POSTs to whatever endpoint
 * is stored, so anything else would let a caller point it at any URL.
 */
export const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

export const MAX_ENDPOINT = 1024;
export const MAX_TZ = 64;
/** Same range Settings offers, with headroom; anything wider is not a preference. */
export const MAX_MANUAL_OFFSET = 10;

/** 16 random bytes, base64url. */
export const PUSH_ID_RE = /^[A-Za-z0-9_-]{22}$/;

export function isPushId(id: unknown): id is string {
  return typeof id === 'string' && PUSH_ID_RE.test(id);
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isHHMM = (v: unknown): v is string => typeof v === 'string' && HHMM_RE.test(v);

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > MAX_TZ) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isPushEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > MAX_ENDPOINT) return false;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  return PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v);

function days(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length > 7 || !v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  return [...new Set(v as number[])].sort((a, b) => a - b);
}

function keyBytes(v: unknown, length: number): boolean {
  const bytes = typeof v === 'string' ? fromB64url(v) : null;
  return !!bytes && bytes.length === length && (length !== 65 || bytes[0] === 4);
}

function schedule(v: unknown): PushSchedule | string {
  if (!isObj(v)) return 'schedule must be an object';
  const { morning, evening, changeAlerts } = v;
  if (morning !== null && !isHHMM(morning)) return 'schedule.morning must be HH:MM or null';
  if (evening !== null && !isHHMM(evening)) return 'schedule.evening must be HH:MM or null';
  if (!morning && !evening) return 'schedule needs a morning or an evening time';
  const d = days(v.days);
  if (!d) return 'schedule.days must be days of the week, 0 to 6';
  if (typeof changeAlerts !== 'boolean') return 'schedule.changeAlerts must be true or false';
  return { morning, evening, days: d, changeAlerts };
}

function profile(v: unknown): PushProfile | string {
  if (!isObj(v)) return 'profile must be an object';
  const { units, comfort, commute: c } = v;
  if (!isObj(units) || !oneOf(units.temp, ['c', 'f']) || !oneOf(units.wind, ['kmh', 'mph', 'ms']) || !oneOf(units.clock, ['24', '12'])) {
    return 'profile.units is not valid';
  }
  if (!oneOf(v.activity, ACTIVITIES)) return 'profile.activity is not valid';
  if (!isNum(v.manualOffset) || Math.abs(v.manualOffset) > MAX_MANUAL_OFFSET) return 'profile.manualOffset is out of range';
  if (!isObj(comfort) || !oneOf(comfort.sensitivity, ['cold', 'average', 'warm'])) return 'profile.comfort is not valid';
  for (const k of ['overheatWhenWalking', 'coldWhenStill'] as const) {
    if (comfort[k] !== undefined && typeof comfort[k] !== 'boolean') return `profile.comfort.${k} must be true or false`;
  }
  for (const k of ['windTolerance', 'rainTolerance'] as const) {
    if (comfort[k] !== undefined && !oneOf(comfort[k], ['low', 'medium', 'high'])) return `profile.comfort.${k} is not valid`;
  }
  if (!isObj(c) || typeof c.enabled !== 'boolean' || !isHHMM(c.out) || !isHHMM(c.back)) return 'profile.commute is not valid';
  if (!isNum(c.legHours) || c.legHours <= 0 || c.legHours > 12) return 'profile.commute.legHours is out of range';
  const cd = days(c.days);
  if (!cd) return 'profile.commute.days must be days of the week, 0 to 6';
  if (c.mode !== undefined && !oneOf(c.mode, ACTIVITIES)) return 'profile.commute.mode is not valid';
  if (v.engine !== undefined && !oneOf(v.engine, ['bands', 'science'])) return 'profile.engine is not valid';
  if (v.duration !== undefined && (!isNum(v.duration) || v.duration <= 0 || v.duration > 24)) return 'profile.duration is out of range';
  if (v.bias !== undefined && (!isNum(v.bias) || Math.abs(v.bias) > MAX_BIAS)) return 'profile.bias is out of range';
  if (v.biasCount !== undefined && (!Number.isInteger(v.biasCount) || (v.biasCount as number) < 0 || (v.biasCount as number) > MAX_BIAS_COUNT)) return 'profile.biasCount is out of range';
  const learned = v.learned === undefined ? undefined : learnSnapshot(v.learned);
  if (learned === null) return 'profile.learned is not valid';
  const routines = v.routines === undefined ? undefined : pushRoutines(v.routines);
  if (routines === null) return 'profile.routines is not valid';

  // Rebuilt field by field so nothing unexpected reaches storage.
  return {
    units: { temp: units.temp, wind: units.wind, clock: units.clock },
    activity: v.activity,
    manualOffset: v.manualOffset,
    comfort: {
      sensitivity: comfort.sensitivity,
      ...(comfort.overheatWhenWalking !== undefined && { overheatWhenWalking: comfort.overheatWhenWalking as boolean }),
      ...(comfort.coldWhenStill !== undefined && { coldWhenStill: comfort.coldWhenStill as boolean }),
      ...(comfort.windTolerance !== undefined && { windTolerance: comfort.windTolerance as 'low' | 'medium' | 'high' }),
      ...(comfort.rainTolerance !== undefined && { rainTolerance: comfort.rainTolerance as 'low' | 'medium' | 'high' }),
    },
    commute: { enabled: c.enabled, out: c.out, back: c.back, legHours: c.legHours, days: cd, ...(c.mode !== undefined && { mode: c.mode }) },
    ...(v.engine !== undefined && { engine: v.engine }),
    ...(v.duration !== undefined && { duration: v.duration }),
    ...(v.bias !== undefined && { bias: v.bias }),
    ...(v.biasCount !== undefined && { biasCount: v.biasCount as number }),
    ...(learned && { learned }),
    ...(routines && { routines }),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EFFORTS: readonly Effort[] = ['easy', 'steady', 'hard'];
/** The bias engine clamps to ±0.6 clo; a little headroom, nothing that isn't a preference. */
export const MAX_BIAS = 1;
/** Years of daily votes; past this it isn't a count. */
const MAX_BIAS_COUNT = 100_000;
/** Far past any real pull (the offset caps at 5°), small enough to mean nothing else. */
const MAX_LEARN_SUM = 1000;
const isSum = (n: unknown): n is number => isNum(n) && Math.abs(n) <= MAX_LEARN_SUM;

function learnSnapshot(v: unknown): LearnSnapshot | null {
  if (!isObj(v) || typeof v.at !== 'string' || !DATE_RE.test(v.at) || !isSum(v.all) || typeof v.any !== 'boolean' || !isObj(v.by)) return null;
  const by: LearnSnapshot['by'] = {};
  for (const [k, n] of Object.entries(v.by)) {
    if (!oneOf(k, ACTIVITIES) || !isSum(n)) return null;
    by[k] = n;
  }
  return { at: v.at, all: v.all, any: v.any, by };
}

function pushRoutines(v: unknown): PushRoutine[] | null {
  if (!Array.isArray(v) || v.length > MAX_PUSH_ROUTINES) return null;
  const out: PushRoutine[] = [];
  for (const r of v) {
    if (!isObj(r) || !isHHMM(r.time) || !isNum(r.hours) || r.hours <= 0 || r.hours > 12 || !oneOf(r.activity, ACTIVITIES)) return null;
    if (r.effort !== undefined && !oneOf(r.effort, EFFORTS)) return null;
    const d = days(r.days);
    if (!d) return null;
    out.push({ time: r.time, hours: r.hours, days: d, activity: r.activity, ...(r.effort !== undefined && { effort: r.effort }) });
  }
  return out;
}

export type ParsedSubscribe = { ok: true; body: SubscribeRequest } | { ok: false; status: 400 | 413; message: string };

export function parseSubscribe(bytes: ArrayBuffer): ParsedSubscribe {
  const bad = (message: string): ParsedSubscribe => ({ ok: false, status: 400, message });
  if (bytes.byteLength > MAX_SUBSCRIBE_BYTES) return { ok: false, status: 413, message: 'Too large' };
  let v: unknown;
  try {
    v = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return bad('Body must be JSON');
  }
  if (!isObj(v)) return bad('Body must be an object');
  if (v.id !== undefined && !isPushId(v.id)) return bad('id is not valid');
  const sub = v.subscription;
  if (!isObj(sub) || !isPushEndpoint(sub.endpoint)) return bad('subscription.endpoint is not a supported push service');
  const keys = sub.keys;
  if (!isObj(keys) || !keyBytes(keys.p256dh, 65) || !keyBytes(keys.auth, 16)) return bad('subscription.keys are not valid');
  if (!isNum(v.lat) || Math.abs(v.lat) > 90) return bad('lat must be between -90 and 90');
  if (!isNum(v.lon) || Math.abs(v.lon) > 180) return bad('lon must be between -180 and 180');
  if (!isTimeZone(v.tz)) return bad('tz must be an IANA time zone');
  const s = schedule(v.schedule);
  if (typeof s === 'string') return bad(s);
  const p = profile(v.profile);
  if (typeof p === 'string') return bad(p);
  return {
    ok: true,
    body: {
      ...(v.id !== undefined && { id: v.id }),
      subscription: { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh as string, auth: keys.auth as string } },
      lat: round2(v.lat),
      lon: round2(v.lon),
      tz: v.tz,
      schedule: s,
      profile: p,
    },
  };
}
