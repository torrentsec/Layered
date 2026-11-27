// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { SQL, type Database, type Statement } from './db';
import { HOUR_MS, hashClient } from './ratelimit';
import { handleSync, MAX_SKEW_MS } from './sync';
import { isSyncCode, MAX_BLOB_BYTES, parsePutBody, SYNC_ALPHABET } from './validate';

/** Understands exactly the statements in SQL, so a query change breaks the test rather than passing silently. */
class FakeD1 implements Database {
  blobs = new Map<string, { data: string; updated_at: number }>();
  limits = new Map<string, number>();

  prepare(sql: string): Statement {
    let args: unknown[] = [];
    const stmt: Statement = {
      bind: (...values) => {
        args = values;
        return stmt;
      },
      first: async <T>() => this.exec(sql, args) as T | null,
      run: async () => this.exec(sql, args),
    };
    return stmt;
  }

  private exec(sql: string, a: unknown[]): unknown {
    switch (sql) {
      case SQL.getBlob:
        return this.blobs.get(a[0] as string) ?? null;
      case SQL.putBlob:
        this.blobs.set(a[0] as string, { data: a[1] as string, updated_at: a[2] as number });
        return null;
      case SQL.deleteBlob:
        this.blobs.delete(a[0] as string);
        return null;
      case SQL.hit: {
        const k = `${a[0]}|${a[1]}`;
        const count = (this.limits.get(k) ?? 0) + 1;
        this.limits.set(k, count);
        return { count };
      }
      case SQL.sweep:
        for (const k of this.limits.keys()) if (Number(k.split('|')[1]) < (a[0] as number)) this.limits.delete(k);
        return null;
      default:
        throw new Error(`Unexpected SQL: ${sql}`);
    }
  }
}

const CODE = 'ABCDE23456';
const NOW = 1_800_000_000_000;
const url = `https://layered.test/api/sync/${CODE}`;

function call(db: FakeD1 | undefined, method: string, body?: unknown, opts: { ip?: string; now?: number; code?: string; raw?: string } = {}) {
  const init: RequestInit = { method };
  if (opts.raw !== undefined) init.body = opts.raw;
  else if (body !== undefined) init.body = JSON.stringify(body);
  return handleSync(new Request(url, init), opts.code ?? CODE, { db, ip: opts.ip ?? '203.0.113.7', now: opts.now ?? NOW });
}

describe('sync codes', () => {
  it('accepts 10 characters from the unambiguous alphabet only', () => {
    expect(isSyncCode(CODE)).toBe(true);
    expect(isSyncCode('ABCDE2345')).toBe(false);
    expect(isSyncCode('ABCDE234567')).toBe(false);
    for (const bad of ['0', 'O', '1', 'I', 'L', 'a']) expect(isSyncCode(`ABCDE2345${bad}`)).toBe(false);
  });

  // Pinned here and in src/data/sync.test.ts, so the two copies cannot drift apart.
  it('uses the shared alphabet', () => {
    expect(SYNC_ALPHABET).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
  });
});

describe('PUT body', () => {
  const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

  it('allows exactly 256 KB and refuses one byte more', () => {
    const shell = '{"updatedAt":1,"data":{"x":""}}';
    const fill = (n: number) => shell.replace('""', `"${'a'.repeat(n - shell.length)}"`);
    expect(parsePutBody(enc(fill(MAX_BLOB_BYTES))).ok).toBe(true);
    expect(parsePutBody(enc(fill(MAX_BLOB_BYTES + 1)))).toMatchObject({ ok: false, status: 413 });
  });

  it('needs a timestamp and an object', () => {
    expect(parsePutBody(enc('nope'))).toMatchObject({ status: 400 });
    expect(parsePutBody(enc('{"data":{}}'))).toMatchObject({ status: 400 });
    expect(parsePutBody(enc('{"updatedAt":-1,"data":{}}'))).toMatchObject({ status: 400 });
    expect(parsePutBody(enc('{"updatedAt":1,"data":[]}'))).toMatchObject({ status: 400 });
    expect(parsePutBody(enc('{"updatedAt":1,"data":null}'))).toMatchObject({ status: 400 });
  });
});

describe('/api/sync/:code', () => {
  it('stores, returns and deletes a blob', async () => {
    const db = new FakeD1();
    expect((await call(db, 'GET')).status).toBe(404);

    const put = await call(db, 'PUT', { updatedAt: NOW - 1000, data: { version: 1, places: [] } });
    expect(put.status).toBe(200);
    expect(await put.json()).toEqual({ updatedAt: NOW });
    expect(put.headers.get('Cache-Control')).toBe('no-store');

    const got = await call(db, 'GET');
    expect(await got.json()).toEqual({ updatedAt: NOW, data: { version: 1, places: [] } });

    expect((await call(db, 'DELETE')).status).toBe(204);
    expect((await call(db, 'GET')).status).toBe(404);
  });

  it('stamps max(client, now), capping clocks that run ahead', async () => {
    const db = new FakeD1();
    const ahead = await call(db, 'PUT', { updatedAt: NOW + 60_000, data: {} });
    expect(await ahead.json()).toEqual({ updatedAt: NOW + 60_000 });
    const wild = await call(db, 'PUT', { updatedAt: NOW + 10 * HOUR_MS, data: {} });
    expect(await wild.json()).toEqual({ updatedAt: NOW + MAX_SKEW_MS });
  });

  it('last write wins', async () => {
    const db = new FakeD1();
    await call(db, 'PUT', { updatedAt: NOW, data: { from: 'a' } });
    await call(db, 'PUT', { updatedAt: NOW - 5000, data: { from: 'b' } }, { now: NOW + 1000 });
    expect(await (await call(db, 'GET')).json()).toEqual({ updatedAt: NOW + 1000, data: { from: 'b' } });
  });

  it('returns 413 over 256 KB, by header or by body', async () => {
    const db = new FakeD1();
    const big = JSON.stringify({ updatedAt: NOW, data: { x: 'a'.repeat(MAX_BLOB_BYTES) } });
    expect((await call(db, 'PUT', undefined, { raw: big })).status).toBe(413);
    const declared = new Request(url, { method: 'PUT', body: '{}', headers: { 'Content-Length': String(MAX_BLOB_BYTES + 1) } });
    expect((await handleSync(declared, CODE, { db, ip: '1', now: NOW })).status).toBe(413);
    expect(db.blobs.size).toBe(0);
  });

  it('rejects bad codes, bad methods and a missing database', async () => {
    const db = new FakeD1();
    expect((await call(db, 'GET', undefined, { code: 'abcde23456' })).status).toBe(400);
    const post = await call(db, 'POST', {});
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET, PUT, DELETE');
    expect((await call(undefined, 'GET')).status).toBe(503);
  });

  it('allows 30 writes per address per hour, then 429', async () => {
    const db = new FakeD1();
    for (let i = 0; i < 30; i++) expect((await call(db, 'PUT', { updatedAt: NOW, data: {} })).status).toBe(200);
    const over = await call(db, 'DELETE');
    expect(over.status).toBe(429);
    expect(Number(over.headers.get('Retry-After'))).toBeGreaterThan(0);

    // Another address, reads and the next hour are unaffected.
    expect((await call(db, 'PUT', { updatedAt: NOW, data: {} }, { ip: '198.51.100.2' })).status).toBe(200);
    expect((await call(db, 'GET')).status).toBe(200);
    expect((await call(db, 'PUT', { updatedAt: NOW, data: {} }, { now: NOW + HOUR_MS })).status).toBe(200);
  });

  it('never stores the raw address and sweeps old windows', async () => {
    const db = new FakeD1();
    await call(db, 'PUT', { updatedAt: NOW, data: {} });
    await call(db, 'PUT', { updatedAt: NOW, data: {} }, { now: NOW + 3 * HOUR_MS });
    const keys = [...db.limits.keys()];
    expect(keys.some((k) => k.includes('203.0.113.7'))).toBe(false);
    expect(keys).toHaveLength(1);
    expect(await hashClient('203.0.113.7')).not.toBe(await hashClient('203.0.113.8'));
  });
});
