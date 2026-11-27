// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, places, settings, exportBundle } from './store';
import {
  clearStorage,
  createSyncCode,
  decide,
  formatCode,
  generateCode,
  normaliseCode,
  stopSyncing,
  SYNC_ALPHABET,
  SyncError,
  syncNow,
  useSyncCode,
  wipeDevice,
} from './sync';

/** A stand-in for /api/sync that stamps max(client, now), like the real one. */
function fakeServer(now = () => 1_000) {
  const blobs = new Map<string, { updatedAt: number; data: unknown }>();
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const code = String(url).split('/').pop()!;
    const method = init?.method ?? 'GET';
    if (method === 'PUT') {
      const body = JSON.parse(String(init!.body)) as { updatedAt: number; data: unknown };
      const updatedAt = Math.max(body.updatedAt, now());
      blobs.set(code, { updatedAt, data: body.data });
      return Response.json({ updatedAt });
    }
    if (method === 'DELETE') {
      blobs.delete(code);
      return new Response(null, { status: 204 });
    }
    const hit = blobs.get(code);
    return hit ? Response.json(hit) : new Response('{}', { status: 404 });
  });
  return { blobs, f: f as unknown as typeof fetch, calls: f };
}

const place = (name: string) => ({ id: name, name, lat: 51.5, lon: 0, detail: '' });

beforeEach(() => {
  settings.value = { ...DEFAULT_SETTINGS };
  places.value = [];
});

describe('codes', () => {
  it('pins the alphabet shared with functions/_lib/validate.ts', () => {
    expect(SYNC_ALPHABET).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
    for (const c of '0O1IL') expect(SYNC_ALPHABET).not.toContain(c);
  });

  it('makes 10 characters from the alphabet', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{10}$/);
  });

  it('discards bytes that would bias the modulo', () => {
    // 248 is the first byte past the largest multiple of 31; it must be skipped, not mapped to 'A'.
    const bytes = [248, 255, ...Array(18).fill(1)];
    expect(generateCode((b) => b.map((_, i) => bytes[i] ?? 1))).toBe('BBBBBBBBBB');
  });

  it('reads codes the way people type them', () => {
    expect(normaliseCode(' abcde-23456 ')).toBe('ABCDE23456');
    expect(normaliseCode('ABCDE2345')).toBeNull();
    expect(normaliseCode('ABCDE2345O')).toBeNull();
    expect(formatCode('ABCDE23456')).toBe('ABCDE-23456');
  });
});

describe('decide', () => {
  it('pushes when there is no remote copy', () => expect(decide(500, null)).toBe('push'));
  it('pulls when the remote is newer than the last sync', () => expect(decide(500, { updatedAt: 501, data: {} })).toBe('pull'));
  it('pushes when the remote is the copy this device last synced', () => expect(decide(500, { updatedAt: 500, data: {} })).toBe('push'));
  it('pulls on a device that has never synced', () => expect(decide(undefined, { updatedAt: 1, data: {} })).toBe('pull'));
});

describe('sync flow', () => {
  it('creates a code, uploads the bundle and records the server time', async () => {
    const s = fakeServer(() => 9_999_999_999_999);
    places.value = [place('Home')];
    const code = await createSyncCode(s.f);
    expect(settings.value.syncCode).toBe(code);
    expect(settings.value.syncedAt).toBe(9_999_999_999_999);
    const stored = s.blobs.get(code)!.data as ReturnType<typeof exportBundle>;
    expect(stored.places).toEqual([place('Home')]);
    expect(stored.settings.syncCode).toBeUndefined();
  });

  it('another device pulls with the code, then the last write wins', async () => {
    let clock = 10_000_000_000_000;
    const s = fakeServer(() => clock);
    places.value = [place('Home')];
    const code = await createSyncCode(s.f);

    // Device B: fresh, uses the code.
    settings.value = { ...DEFAULT_SETTINGS };
    places.value = [];
    await useSyncCode(formatCode(code).toLowerCase(), s.f);
    expect(places.value).toEqual([place('Home')]);
    expect(settings.value.syncCode).toBe(code);

    // B edits and syncs: nothing newer remotely, so it pushes.
    places.value = [place('Home'), place('Work')];
    clock += 1000;
    expect(await syncNow(s.f)).toBe('pushed');
    const bAt = settings.value.syncedAt!;
    expect(bAt).toBe(clock);

    // Device A, still at its older syncedAt, pulls B's newer copy over its local edit.
    settings.value = { ...settings.value, syncedAt: bAt - 1000 };
    places.value = [place('Gym')];
    expect(await syncNow(s.f)).toBe('pulled');
    expect(places.value.map((p) => p.name)).toEqual(['Home', 'Work']);
    expect(settings.value.syncedAt).toBe(bAt);
  });

  it('keeps this device’s notification settings when pulling', async () => {
    const s = fakeServer();
    const code = await createSyncCode(s.f);
    settings.value = { ...settings.value, notify: { ...DEFAULT_SETTINGS.notify, enabled: true } };
    settings.value = { ...settings.value, syncedAt: 0 };
    s.blobs.get(code)!.updatedAt = 5_000;
    expect(await syncNow(s.f)).toBe('pulled');
    expect(settings.value.notify.enabled).toBe(true);
  });

  it('explains unknown codes and server errors', async () => {
    const s = fakeServer();
    await expect(useSyncCode('ABCDE23456', s.f)).rejects.toThrow('Nothing is stored under that code.');
    await expect(useSyncCode('nope', s.f)).rejects.toBeInstanceOf(SyncError);
    const busy = (async () => new Response('{}', { status: 429 })) as unknown as typeof fetch;
    await expect(createSyncCode(busy)).rejects.toThrow(/Too many syncs/);
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(createSyncCode(offline)).rejects.toThrow(/Couldn’t reach/);
    expect(settings.value.syncCode).toBeUndefined();
  });

  it('stops syncing, optionally deleting the server copy', async () => {
    const s = fakeServer();
    const code = await createSyncCode(s.f);
    await stopSyncing(false, s.f);
    expect(settings.value.syncCode).toBeUndefined();
    expect(s.blobs.has(code)).toBe(true);

    settings.value = { ...settings.value, syncCode: code };
    await stopSyncing(true, s.f);
    expect(s.blobs.has(code)).toBe(false);
    expect(settings.value.syncedAt).toBeUndefined();
  });
});

describe('wipe', () => {
  function memoryStorage(entries: Record<string, string>) {
    const m = new Map(Object.entries(entries));
    return {
      map: m,
      get length() {
        return m.size;
      },
      key: (i: number) => [...m.keys()][i] ?? null,
      removeItem: (k: string) => void m.delete(k),
    };
  }

  it('clears every layered: key and the theme, leaving others alone', () => {
    const st = memoryStorage({
      'layered:v1:settings': '{}',
      'layered:fc:51.50,0.00': '{}',
      'layered:typical:51.50,0.00:2026-12-01:2026-12-05': '{}',
      'color-scheme': 'dark',
      'other-app': 'x',
    });
    clearStorage(st);
    expect([...st.map.keys()]).toEqual(['other-app']);
  });

  it('unsubscribes push, drops weather caches and survives missing APIs', async () => {
    const unsubscribe = vi.fn(async () => true);
    const reg = { pushManager: { getSubscription: async () => ({ unsubscribe }) } };
    const deleted: string[] = [];
    const st = memoryStorage({ 'layered:v1:places': '[]' });
    await wipeDevice({
      storage: st,
      serviceWorker: { getRegistrations: async () => [reg as unknown as ServiceWorkerRegistration] },
      caches: { keys: async () => ['layered-open-meteo', 'workbox-precache-v2'], delete: async (n: string) => (deleted.push(n), true) },
    });
    expect(unsubscribe).toHaveBeenCalled();
    expect(deleted).toEqual(['layered-open-meteo']);
    expect(st.map.size).toBe(0);

    const st2 = memoryStorage({ 'layered:v1:x': '1' });
    await wipeDevice({ storage: st2, serviceWorker: { getRegistrations: async () => Promise.reject(new Error('blocked')) } });
    expect(st2.map.size).toBe(0);
  });
});
