// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Sync payloads are personal; no browser or edge cache should keep a copy.
const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return rawJson(JSON.stringify(body), status, headers);
}

/** For bodies already serialised, such as a stored blob, to avoid a parse and re-stringify. */
export function rawJson(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

export function error(status: number, message: string, headers: Record<string, string> = {}): Response {
  return json({ error: message }, status, headers);
}

export function empty(status = 204): Response {
  return new Response(null, { status, headers: BASE_HEADERS });
}
