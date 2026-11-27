// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { fromB64url, toB64url } from '../../functions/_lib/b64';

/**
 * Web Push with WebCrypto only: message encryption per RFC 8291 (aes128gcm,
 * RFC 8188) and VAPID per RFC 8292. Written here rather than pulled in so the
 * Worker runs without nodejs_compat and every byte on the wire is tested.
 */

/** One record is enough: payloads are a few hundred bytes. */
export const RECORD_SIZE = 4096;
// A record holds the payload, a one-byte delimiter and the 16-byte GCM tag.
export const MAX_PLAINTEXT = RECORD_SIZE - 17;
/** RFC 8292 caps the token at 24 hours; 12 leaves room for clock skew at the push service. */
export const JWT_LIFETIME_S = 12 * 3600;

const enc = new TextEncoder();

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, bytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

export interface EncryptOptions {
  /** Fixed only by tests reproducing RFC 8291's worked example. */
  salt?: Uint8Array<ArrayBuffer>;
  serverKeys?: CryptoKeyPair;
}

/** The aes128gcm body for one subscription: header, then a single encrypted record. */
export async function encryptPayload(
  plaintext: Uint8Array<ArrayBuffer>,
  uaPublic: Uint8Array<ArrayBuffer>,
  authSecret: Uint8Array<ArrayBuffer>,
  opts: EncryptOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  if (plaintext.length > MAX_PLAINTEXT) throw new Error('Push payload too large');
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  // A fresh key pair per message, so one leaked message key exposes nothing else.
  const server = opts.serverKeys ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair);
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', server.publicKey)) as ArrayBuffer);

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, server.privateKey, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last (and only) record, with no padding after it.
  const record = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  return concat(header, asPublic, record);
}

export interface Vapid {
  /** Uncompressed P-256 point, base64url. */
  publicKey: string;
  /** The private scalar d, base64url. */
  privateKey: string;
  subject: string;
}

export interface VapidSigner {
  publicKey: string;
  subject: string;
  key: CryptoKey;
}

export async function importVapid(v: Vapid): Promise<VapidSigner> {
  const pub = fromB64url(v.publicKey);
  if (!pub || pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY is not an uncompressed P-256 key');
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x: toB64url(pub.subarray(1, 33)), y: toB64url(pub.subarray(33)), d: v.privateKey };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return { publicKey: v.publicKey, subject: v.subject, key };
}

/** `Authorization` header value for one push service origin. */
export async function vapidAuthorization(endpoint: string, signer: VapidSigner, now: number): Promise<string> {
  const header = toB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + JWT_LIFETIME_S, sub: signer.subject };
  const body = toB64url(enc.encode(JSON.stringify(claims)));
  // WebCrypto signs in the raw r||s form JWS expects, not DER.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.key, enc.encode(`${header}.${body}`)));
  return `vapid t=${header}.${body}.${toB64url(sig)}, k=${signer.publicKey}`;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendOptions {
  fetch: typeof fetch;
  now: number;
  /** Seconds the push service may hold the message for an offline device. */
  ttl: number;
  /** Lets a newer message of the same kind replace an undelivered one. */
  topic?: string;
}

/** Returns the push service's status; the caller decides what 404 or 410 means. */
export async function sendPush(target: PushTarget, payload: string, signer: VapidSigner, opts: SendOptions): Promise<number> {
  const ua = fromB64url(target.p256dh);
  const auth = fromB64url(target.auth);
  if (!ua || !auth) throw new Error('Subscription keys are not base64url');
  const body = await encryptPayload(enc.encode(payload), ua, auth);
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization(target.endpoint, signer, opts.now),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl),
    Urgency: 'normal',
  };
  if (opts.topic) headers.Topic = opts.topic;
  const res = await opts.fetch(target.endpoint, { method: 'POST', headers, body });
  return res.status;
}
