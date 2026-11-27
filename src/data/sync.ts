// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { exportBundle, importBundle, patchSettings, settings, type Bundle } from './store';
import { longDate, timeFmt } from './format';
import type { Clock } from './units';
import { PUSH_API } from './push-api';

/** Must match functions/_lib/validate.ts. No 0/O, 1/I/L: codes get read aloud and retyped. */
export const SYNC_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;

type Random = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
const cryptoRandom: Random = (b) => crypto.getRandomValues(b);

/** Rejection sampling keeps every character equally likely; a plain modulo would favour the first few. */
export function generateCode(random: Random = cryptoRandom): string {
  const n = SYNC_ALPHABET.length;
  const ceiling = 256 - (256 % n);
  let code = '';
  while (code.length < CODE_LENGTH) {
    for (const b of random(new Uint8Array(CODE_LENGTH * 2))) {
      if (b < ceiling && code.length < CODE_LENGTH) code += SYNC_ALPHABET[b % n];
    }
  }
  return code;
}

/** Accepts what people type: lower case, spaces and the display hyphen. */
export function normaliseCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return code.length === CODE_LENGTH && [...code].every((c) => SYNC_ALPHABET.includes(c)) ? code : null;
}

export const formatCode = (code: string): string => `${code.slice(0, 5)}-${code.slice(5)}`;

export class SyncError extends Error {}

export interface Remote {
  updatedAt: number;
  data: unknown;
}

type Fetch = typeof fetch;
const endpoint = (code: string) => `/api/sync/${encodeURIComponent(code)}`;

async function request(f: Fetch, code: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await f(endpoint(code), { ...init, cache: 'no-store' });
  } catch {
    throw new SyncError('Couldn’t reach the sync server. Check your connection.');
  }
  if (res.ok || res.status === 404) return res;
  if (res.status === 429) throw new SyncError('Too many syncs from this network. Try again in an hour.');
  if (res.status === 413) throw new SyncError('Your data is too large to sync.');
  throw new SyncError('Sync isn’t working right now. Try again later.');
}

export async function pull(code: string, f: Fetch = fetch): Promise<Remote | null> {
  const res = await request(f, code);
  if (res.status === 404) return null;
  const body = (await res.json()) as Remote;
  if (typeof body?.updatedAt !== 'number') throw new SyncError('The synced copy is damaged.');
  return body;
}

/** Returns the server's timestamp, which becomes this device's `syncedAt`. */
export async function push(code: string, bundle: Bundle, f: Fetch = fetch): Promise<number> {
  const res = await request(f, code, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updatedAt: bundle.updatedAt, data: bundle }),
  });
  if (res.status === 404) throw new SyncError('Sync isn’t working right now. Try again later.');
  return ((await res.json()) as { updatedAt: number }).updatedAt;
}

export async function removeRemote(code: string, f: Fetch = fetch): Promise<void> {
  await request(f, code, { method: 'DELETE' });
}

/**
 * Last write wins. If another device pushed since this one last synced, its
 * copy is newer and replaces local changes; otherwise this device's copy wins.
 */
export function decide(syncedAt: number | undefined, remote: Remote | null): 'pull' | 'push' {
  return remote && remote.updatedAt > (syncedAt ?? 0) ? 'pull' : 'push';
}

// The code and timestamp describe this device's link, not the data, so they never travel.
function outgoing(): Bundle {
  const b = exportBundle();
  const rest = { ...b.settings };
  delete rest.syncCode;
  delete rest.syncedAt;
  return { ...b, settings: rest };
}

function applyRemote(code: string, remote: Remote): void {
  importBundle(remote.data);
  patchSettings({ syncCode: code, syncedAt: remote.updatedAt });
}

export async function createSyncCode(f: Fetch = fetch): Promise<string> {
  const code = generateCode();
  const syncedAt = await push(code, outgoing(), f);
  patchSettings({ syncCode: code, syncedAt });
  return code;
}

/** Replaces this device's data with the copy stored under `input`. */
export async function useSyncCode(input: string, f: Fetch = fetch): Promise<void> {
  const code = normaliseCode(input);
  if (!code) throw new SyncError(`A sync code is ${CODE_LENGTH} letters and numbers.`);
  const remote = await pull(code, f);
  if (!remote) throw new SyncError('Nothing is stored under that code.');
  applyRemote(code, remote);
}

export async function syncNow(f: Fetch = fetch): Promise<'pulled' | 'pushed'> {
  const { syncCode, syncedAt } = settings.value;
  if (!syncCode) throw new SyncError('Sync isn’t set up on this device.');
  const remote = await pull(syncCode, f);
  if (decide(syncedAt, remote) === 'pull') {
    applyRemote(syncCode, remote!);
    return 'pulled';
  }
  patchSettings({ syncedAt: await push(syncCode, outgoing(), f) });
  return 'pushed';
}

export async function stopSyncing(deleteRemote: boolean, f: Fetch = fetch): Promise<void> {
  const code = settings.value.syncCode;
  if (code && deleteRemote) await removeRemote(code, f);
  patchSettings({ syncCode: undefined, syncedAt: undefined });
}

export function syncedLabel(at: number, clock: Clock, now: number = Date.now()): string {
  const local = (ms: number) => {
    const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  };
  const iso = local(at);
  const time = timeFmt(clock)(iso);
  return iso.slice(0, 10) === local(now).slice(0, 10) ? `today at ${time}` : `${longDate(iso.slice(0, 10))} at ${time}`;
}

export interface WipeEnv {
  storage?: Pick<Storage, 'length' | 'key' | 'removeItem'>;
  caches?: Pick<CacheStorage, 'keys' | 'delete'>;
  serviceWorker?: Pick<ServiceWorkerContainer, 'getRegistrations'>;
}

const browserEnv = (): WipeEnv => ({
  storage: typeof localStorage === 'undefined' ? undefined : localStorage,
  caches: typeof caches === 'undefined' ? undefined : caches,
  serviceWorker: typeof navigator === 'undefined' ? undefined : navigator.serviceWorker,
});

/**
 * Best effort: wipeDevice unsubscribes the browser too, and the push service
 * then answers 410, which makes the Worker delete the row on its next send.
 */
export async function removePushSubscription(id: string, f: Fetch = fetch): Promise<void> {
  try {
    await f(`${PUSH_API.subscription}/${encodeURIComponent(id)}`, { method: 'DELETE', cache: 'no-store' });
  } catch {
    // Offline: the 410 route above still clears it.
  }
}

/** Throws if the sync copy could not be deleted, so the caller can say so before wiping the code that names it. */
export async function deleteServerCopy(f: Fetch = fetch): Promise<void> {
  const { syncCode, notify } = settings.value;
  if (notify.subscriptionId) await removePushSubscription(notify.subscriptionId, f);
  if (syncCode) await removeRemote(syncCode, f);
}

/** The theme key sits outside the `layered:` prefix because index.html reads it before the app loads. */
const EXTRA_KEYS = ['color-scheme'];

export function clearStorage(storage = browserEnv().storage): void {
  if (!storage) return;
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && (k.startsWith('layered:') || EXTRA_KEYS.includes(k))) doomed.push(k);
  }
  for (const k of doomed) storage.removeItem(k);
}

/**
 * Everything this device holds: push subscriptions, cached forecasts and every
 * stored key. Each step is best effort so one blocked API can't leave the rest behind.
 */
export async function wipeDevice(env: WipeEnv = browserEnv()): Promise<void> {
  try {
    // getRegistrations rather than `ready`, which never settles when no worker is installed.
    const regs = (await env.serviceWorker?.getRegistrations()) ?? [];
    for (const reg of regs) await (await reg.pushManager?.getSubscription())?.unsubscribe();
  } catch {
    // Push unsupported or permission revoked: there is no subscription to remove.
  }
  try {
    // The app shell's precache stays so the app still opens offline; only weather caches go.
    for (const name of (await env.caches?.keys()) ?? []) if (name.startsWith('layered-')) await env.caches!.delete(name);
  } catch {
    // Cache Storage blocked; nothing was cached.
  }
  clearStorage(env.storage);
}
