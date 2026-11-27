// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/** Must match `SYNC_ALPHABET` in src/data/sync.ts. No 0/O, 1/I/L: codes get read aloud and retyped. */
export const SYNC_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;
export const MAX_BLOB_BYTES = 256 * 1024;

const CODE_RE = new RegExp(`^[${SYNC_ALPHABET}]{${CODE_LENGTH}}$`);

export function isSyncCode(code: unknown): code is string {
  return typeof code === 'string' && CODE_RE.test(code);
}

export interface PutBody {
  updatedAt: number;
  /** The bundle, re-serialised so nothing but valid JSON reaches storage. */
  data: string;
}

export type Parsed = { ok: true; body: PutBody } | { ok: false; status: 400 | 413; message: string };

export function parsePutBody(bytes: ArrayBuffer): Parsed {
  if (bytes.byteLength > MAX_BLOB_BYTES) return { ok: false, status: 413, message: 'Too large' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, status: 400, message: 'Body must be JSON' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, status: 400, message: 'Body must be an object' };
  const { updatedAt, data } = parsed as { updatedAt?: unknown; data?: unknown };
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt < 0) {
    return { ok: false, status: 400, message: 'updatedAt must be a timestamp' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, status: 400, message: 'data must be an object' };
  return { ok: true, body: { updatedAt: Math.floor(updatedAt), data: JSON.stringify(data) } };
}
