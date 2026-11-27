// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// The slice of D1 the sync API uses. Narrow on purpose, so tests can stand
// in an in-memory fake and the real D1Database still satisfies it.
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface Database {
  prepare(sql: string): Statement;
}

export const SQL = {
  getBlob: 'SELECT data, updated_at FROM sync_blobs WHERE code = ?1',
  putBlob:
    'INSERT INTO sync_blobs (code, data, updated_at) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT (code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
  deleteBlob: 'DELETE FROM sync_blobs WHERE code = ?1',
  hit:
    'INSERT INTO rate_limits (key, "window", count) VALUES (?1, ?2, 1) ' +
    'ON CONFLICT (key, "window") DO UPDATE SET count = count + 1 RETURNING count',
  sweep: 'DELETE FROM rate_limits WHERE "window" < ?1',
} as const;
