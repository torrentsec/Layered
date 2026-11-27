// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { fetchForecast } from './forecast';
import { runOnce, TTL } from './run';
import { importVapid, sendPush } from './webpush';

export interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export const DEFAULT_SUBJECT = 'https://layered-a9i.pages.dev';

const log = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry));

export async function scheduled(env: Env, now: number): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.error(JSON.stringify({ message: 'VAPID keys are not set; nothing sent' }));
    return;
  }
  const signer = await importVapid({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || DEFAULT_SUBJECT });
  // Workers rejects `fetch` called with any receiver but the global.
  const f: typeof fetch = (input, init) => fetch(input, init);
  const stats = await runOnce({
    db: env.DB,
    now,
    forecast: (lat, lon, offset) => fetchForecast(lat, lon, offset, f, now),
    send: (row, payload, kind) => sendPush(row, payload, signer, { fetch: f, now, ttl: TTL[kind], topic: kind }),
    log,
  });
  log({ message: 'run finished', ...stats });
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scheduled(env, controller.scheduledTime));
  },
} satisfies ExportedHandler<Env>;
