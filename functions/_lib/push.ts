// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { MAX_SUBSCRIBE_BYTES } from '../../src/data/push-api';
import { toB64url } from './b64';
import type { Database } from './db';
import { empty, error, json } from './http';
import { PUSH_SQL } from './push-db';
import { isPushId, parseSubscribe } from './push-validate';
import { hashClient, hit, WRITE_LIMIT } from './ratelimit';

export interface PushDeps {
  db: Database | undefined;
  ip: string | null;
  salt?: string;
  now: number;
  /** Injected so tests get predictable ids. */
  newId?: () => string;
}

export const newPushId = (): string => toB64url(crypto.getRandomValues(new Uint8Array(16)));

export function handleKey(request: Request, publicKey: string | undefined): Response {
  if (request.method.toUpperCase() !== 'GET') return error(405, 'Method not allowed', { Allow: 'GET' });
  if (!publicKey) return error(503, 'Notifications are not available');
  return json({ publicKey });
}

async function overLimit(db: Database, deps: PushDeps): Promise<Response | null> {
  // Its own salt, so sync and push each get the full write allowance.
  const client = await hashClient(deps.ip, `${deps.salt ?? 'layered'}:push`);
  const verdict = await hit(db, client, WRITE_LIMIT, deps.now);
  return verdict.allowed ? null : error(429, 'Too many requests', { 'Retry-After': String(verdict.retryAfter) });
}

export async function handleSubscribe(request: Request, deps: PushDeps): Promise<Response> {
  if (request.method.toUpperCase() !== 'POST') return error(405, 'Method not allowed', { Allow: 'POST' });
  const { db } = deps;
  if (!db) return error(503, 'Notifications are not available');
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_SUBSCRIBE_BYTES) return error(413, 'Too large');

  const limited = await overLimit(db, deps);
  if (limited) return limited;

  const parsed = parseSubscribe(await request.arrayBuffer());
  if (!parsed.ok) return error(parsed.status, parsed.message);
  const b = parsed.body;

  // An unknown id (deleted, or from another install) falls back to the endpoint, then to a new row.
  const known = b.id ? await db.prepare(PUSH_SQL.byId).bind(b.id).first<{ id: string }>() : null;
  const byEndpoint = known ? null : await db.prepare(PUSH_SQL.byEndpoint).bind(b.subscription.endpoint).first<{ id: string }>();
  const id = known?.id ?? byEndpoint?.id ?? (deps.newId ?? newPushId)();

  await db.prepare(PUSH_SQL.dropEndpoint).bind(b.subscription.endpoint, id).run();
  await db
    .prepare(PUSH_SQL.upsert)
    .bind(
      id,
      b.subscription.endpoint,
      b.subscription.keys.p256dh,
      b.subscription.keys.auth,
      b.lat,
      b.lon,
      b.tz,
      JSON.stringify(b.schedule),
      JSON.stringify(b.profile),
      deps.now,
    )
    .run();
  return json({ id });
}

export async function handleUnsubscribe(request: Request, id: string, deps: PushDeps): Promise<Response> {
  if (request.method.toUpperCase() !== 'DELETE') return error(405, 'Method not allowed', { Allow: 'DELETE' });
  if (!isPushId(id)) return error(400, 'Invalid subscription id');
  const { db } = deps;
  if (!db) return error(503, 'Notifications are not available');
  const limited = await overLimit(db, deps);
  if (limited) return limited;
  const gone = await db.prepare(PUSH_SQL.remove).bind(id).first<{ id: string }>();
  return gone ? empty() : error(404, 'Not found');
}
