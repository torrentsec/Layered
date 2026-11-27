// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describe, expect, it, vi } from 'vitest';
import { fromB64url, toB64url } from '../../functions/_lib/b64';
import { encryptPayload, importVapid, JWT_LIFETIME_S, MAX_PLAINTEXT, RECORD_SIZE, sendPush, vapidAuthorization } from './webpush';

const b = (s: string) => fromB64url(s)!;
const text = new TextEncoder();

// RFC 8291 Appendix A.
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_' +
    'yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

function jwkFor(pub: string, d?: string): JsonWebKey {
  const p = b(pub);
  return { kty: 'EC', crv: 'P-256', x: toB64url(p.subarray(1, 33)), y: toB64url(p.subarray(33)), ...(d ? { d } : {}) };
}

const ecdh = { name: 'ECDH', namedCurve: 'P-256' } as const;

async function pairFrom(pub: string, d: string): Promise<CryptoKeyPair> {
  return {
    privateKey: await crypto.subtle.importKey('jwk', jwkFor(pub, d), ecdh, false, ['deriveBits']),
    publicKey: await crypto.subtle.importKey('raw', b(pub), ecdh, true, []),
  };
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: string | Uint8Array<ArrayBuffer>, n: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const i = typeof info === 'string' ? text.encode(info) : info;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: i }, key, n * 8));
}

/** What a browser does on receipt, written from the RFC independently of the encoder. */
async function decrypt(body: Uint8Array<ArrayBuffer>, uaPrivate: CryptoKey, uaPublic: Uint8Array<ArrayBuffer>, auth: Uint8Array<ArrayBuffer>): Promise<string> {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const record = body.slice(21 + idlen);
  expect(rs).toBe(RECORD_SIZE);
  expect(record.length).toBeLessThanOrEqual(rs);

  const asKey = await crypto.subtle.importKey('raw', asPublic, ecdh, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPrivate, 256));
  const info = new Uint8Array([...text.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await hkdf(auth, shared, info, 32);
  const cek = await hkdf(salt, ikm, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = await hkdf(salt, ikm, 'Content-Encoding: nonce\0', 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, record));
  expect(plain[plain.length - 1]).toBe(2);
  return new TextDecoder().decode(plain.slice(0, -1));
}

describe('RFC 8291 message encryption', () => {
  it('reproduces the worked example byte for byte', async () => {
    const body = await encryptPayload(text.encode(RFC.plaintext), b(RFC.uaPublic), b(RFC.auth), {
      salt: b(RFC.salt),
      serverKeys: await pairFrom(RFC.asPublic, RFC.asPrivate),
    });
    expect(toB64url(body)).toBe(RFC.body);
  });

  it('round-trips with a fresh key pair and salt each time', async () => {
    const ua = (await crypto.subtle.generateKey(ecdh, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer);
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const msg = JSON.stringify({ title: 'Today', body: 'Coat + umbrella today · showers from 16:00' });
    const one = await encryptPayload(text.encode(msg), uaPublic, auth);
    const two = await encryptPayload(text.encode(msg), uaPublic, auth);
    expect(toB64url(one)).not.toBe(toB64url(two));
    expect(await decrypt(one, ua.privateKey, uaPublic, auth)).toBe(msg);
    expect(await decrypt(two, ua.privateKey, uaPublic, auth)).toBe(msg);
  });

  it('decrypts the RFC body with the RFC receiver key', async () => {
    const uaPriv = await crypto.subtle.importKey('jwk', jwkFor(RFC.uaPublic, RFC.uaPrivate), ecdh, false, ['deriveBits']);
    expect(await decrypt(b(RFC.body), uaPriv, b(RFC.uaPublic), b(RFC.auth))).toBe(RFC.plaintext);
  });

  it('refuses a payload that would not fit one record', async () => {
    const big = new Uint8Array(MAX_PLAINTEXT + 1);
    await expect(encryptPayload(big, b(RFC.uaPublic), b(RFC.auth))).rejects.toThrow('too large');
    await expect(encryptPayload(new Uint8Array(MAX_PLAINTEXT), b(RFC.uaPublic), b(RFC.auth))).resolves.toHaveLength(RECORD_SIZE + 86);
  });
});

async function vapidPair() {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const publicKey = toB64url(new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer));
  return { verifyKey: kp.publicKey, vapid: { publicKey, privateKey: jwk.d!, subject: 'https://layered-a9i.pages.dev' } };
}

describe('VAPID (RFC 8292)', () => {
  const NOW = Date.UTC(2026, 10, 27, 7, 0);

  it('signs an ES256 token for the push service origin', async () => {
    const { verifyKey, vapid } = await vapidPair();
    const signer = await importVapid(vapid);
    const auth = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc:def', signer, NOW);
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(auth)!;
    expect(m).not.toBeNull();
    expect(m[4]).toBe(vapid.publicKey);
    expect(JSON.parse(new TextDecoder().decode(b(m[1])))).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(new TextDecoder().decode(b(m[2])))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: NOW / 1000 + JWT_LIFETIME_S,
      sub: 'https://layered-a9i.pages.dev',
    });
    expect(JWT_LIFETIME_S).toBeLessThanOrEqual(24 * 3600);
    const sig = b(m[3]);
    expect(sig).toHaveLength(64);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, sig, text.encode(`${m[1]}.${m[2]}`));
    expect(ok).toBe(true);
  });

  it('rejects a public key that is not an uncompressed point', async () => {
    const { vapid } = await vapidPair();
    await expect(importVapid({ ...vapid, publicKey: vapid.publicKey.slice(2) })).rejects.toThrow('VAPID_PUBLIC_KEY');
  });

  it('posts an encrypted body with the Web Push headers', async () => {
    const { vapid } = await vapidPair();
    const signer = await importVapid(vapid);
    const ua = (await crypto.subtle.generateKey(ecdh, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer);
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const f = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 201 }));
    const status = await sendPush(
      { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/xyz', p256dh: toB64url(uaPublic), auth: toB64url(auth) },
      '{"title":"Today","body":"Coat today · dry"}',
      signer,
      { fetch: f as unknown as typeof fetch, now: NOW, ttl: 3600, topic: 'morning' },
    );
    expect(status).toBe(201);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://updates.push.services.mozilla.com/wpush/v2/xyz');
    const h = init!.headers as Record<string, string>;
    expect(h['Content-Encoding']).toBe('aes128gcm');
    expect(h.TTL).toBe('3600');
    expect(h.Topic).toBe('morning');
    expect(h.Authorization).toMatch(/^vapid t=/);
    expect(await decrypt(init!.body as Uint8Array<ArrayBuffer>, ua.privateKey, uaPublic, auth)).toBe('{"title":"Today","body":"Coat today · dry"}');
  });
});
