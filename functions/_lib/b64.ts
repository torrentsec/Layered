// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

// Web Push keys and VAPID tokens are all base64url without padding (RFC 7515 §2).

export function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Null for anything that isn't base64url, so callers can treat bad keys as a validation failure. */
export function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(s)) return null;
  const b64 = s.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (b64.length % 4 === 1) return null;
  try {
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
