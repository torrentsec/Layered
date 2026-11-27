// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & typeof globalThis;

interface PushPayload {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
}

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// The app keeps its own forecast cache; this is a second line for the
// geocoder and air-quality calls that would otherwise fail offline.
registerRoute(
  ({ url }) => url.hostname.endsWith('open-meteo.com'),
  new NetworkFirst({
    cacheName: 'layered-open-meteo',
    networkTimeoutSeconds: 6,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 2 })],
  }),
);

registerRoute(
  ({ url, request }) => url.origin === self.location.origin && url.pathname === '/api/forecast' && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'layered-forecast',
    networkTimeoutSeconds: 6,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 2 })],
  }),
);

function readPush(data: PushMessageData | null): PushPayload {
  if (!data) return {};
  try {
    const v: unknown = data.json();
    return v && typeof v === 'object' ? (v as PushPayload) : {};
  } catch {
    // A plain-text push still deserves a notification rather than a silent drop,
    // which Safari counts against the site.
    return { body: data.text() };
  }
}

self.addEventListener('push', (event) => {
  const p = readPush(event.data);
  event.waitUntil(
    self.registration.showNotification(p.title || 'Layered', {
      body: p.body,
      tag: p.tag,
      icon: '/icons/icon-192.png',
      data: { url: p.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data as { url?: string } | null)?.url || '/';
  // Only open our own pages, whatever the payload says.
  const target = new URL(raw, self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = all.find((c) => c.url === url) ?? all[0];
      if (open) {
        if (open.url !== url && 'navigate' in open) await open.navigate(url).catch(() => undefined);
        await open.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
