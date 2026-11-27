// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { SQL, type Database } from './db';
import { empty, error, json, rawJson } from './http';
import { hashClient, hit, READ_LIMIT, WRITE_LIMIT, type Limit } from './ratelimit';
import { isSyncCode, MAX_BLOB_BYTES, parsePutBody } from './validate';

/**
 * How far ahead of the server a client clock may claim to be. Without a cap,
 * one device with a wrong clock would stamp the blob so far ahead that every
 * other device's pull check would treat its own pushes as older.
 */
export const MAX_SKEW_MS = 5 * 60_000;

export interface SyncDeps {
  db: Database | undefined;
  ip: string | null;
  salt?: string;
  now: number;
}

const ALLOW = 'GET, PUT, DELETE';

export async function handleSync(request: Request, code: string, deps: SyncDeps): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'PUT' && method !== 'DELETE') return error(405, 'Method not allowed', { Allow: ALLOW });
  if (!isSyncCode(code)) return error(400, 'Invalid sync code');
  const { db } = deps;
  if (!db) return error(503, 'Sync is not available');

  const limited = await overLimit(db, deps, method === 'GET' ? READ_LIMIT : WRITE_LIMIT);
  if (limited) return limited;

  if (method === 'GET') {
    const row = await db.prepare(SQL.getBlob).bind(code).first<{ data: string; updated_at: number }>();
    if (!row) return error(404, 'Not found');
    return rawJson(`{"updatedAt":${Number(row.updated_at)},"data":${row.data}}`);
  }

  if (method === 'DELETE') {
    await db.prepare(SQL.deleteBlob).bind(code).run();
    return empty();
  }

  // Refuse early on the declared size so an oversized body is never buffered.
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BLOB_BYTES) return error(413, 'Too large');
  const parsed = parsePutBody(await request.arrayBuffer());
  if (!parsed.ok) return error(parsed.status, parsed.message);
  const updatedAt = Math.max(Math.min(parsed.body.updatedAt, deps.now + MAX_SKEW_MS), deps.now);
  await db.prepare(SQL.putBlob).bind(code, parsed.body.data, updatedAt).run();
  return json({ updatedAt });
}

async function overLimit(db: Database, deps: SyncDeps, limit: Limit): Promise<Response | null> {
  const verdict = await hit(db, await hashClient(deps.ip, deps.salt), limit, deps.now);
  return verdict.allowed ? null : error(429, 'Too many requests', { 'Retry-After': String(verdict.retryAfter) });
}
