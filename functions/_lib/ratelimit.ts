// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { SQL, type Database } from './db';

export const HOUR_MS = 3_600_000;

export interface Limit {
  /** Kept apart so reads never use up a device's write allowance. */
  bucket: 'read' | 'write';
  max: number;
  windowMs: number;
}

export const WRITE_LIMIT: Limit = { bucket: 'write', max: 30, windowMs: HOUR_MS };
// Generous for real use, but enough to make walking the code space pointless.
export const READ_LIMIT: Limit = { bucket: 'read', max: 300, windowMs: HOUR_MS };

/**
 * The raw address is never stored. A salted SHA-256 keeps counters per client
 * without the table becoming a log of who used the API.
 */
export async function hashClient(ip: string | null, salt = 'layered-sync'): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip ?? 'unknown'}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface Verdict {
  allowed: boolean;
  /** Seconds until the current window ends, for Retry-After. */
  retryAfter: number;
}

/** Fixed window: counts the hit, then allows it while the count is within `max`. */
export async function hit(db: Database, client: string, limit: Limit, now: number): Promise<Verdict> {
  const window = Math.floor(now / limit.windowMs);
  const row = await db.prepare(SQL.hit).bind(`${limit.bucket}:${client}`, window).first<{ count: number }>();
  const count = row?.count ?? 1;
  // The first hit of a window is a cheap moment to drop counters nobody can reach any more.
  if (count === 1) await db.prepare(SQL.sweep).bind(window - 1).run();
  const retryAfter = Math.ceil(((window + 1) * limit.windowMs - now) / 1000);
  return { allowed: count <= limit.max, retryAfter };
}
