# Architecture

Layered is a static web app with three small server pieces. Almost everything happens on the phone: the forecast is fetched from the browser, the advice is worked out in the browser, and your wardrobe, comfort profile and ratings live in the browser's storage. The server side exists for the things a phone can't do alone: a weather fallback, moving your data to another device, and waking you up with a notification.

## The pieces

```
 ┌──────────────────────────── your phone ─────────────────────────────┐
 │                                                                      │
 │  Browser app (Preact + @preact/signals)                              │
 │  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐  │
 │  │ src/screens  │◄─┤ src/state          │◄─┤ src/data             │  │
 │  │ Today, Week, │  │ forecast, advice   │  │ store (localStorage) │  │
 │  │ Trip, Wardr. │  │ (signals)          │  │ cache, sync, push    │  │
 │  │ Settings     │  └─────────┬──────────┘  └──────────┬───────────┘  │
 │  └──────────────┘            │ advise()               │              │
 │                    ┌─────────▼──────────┐             │              │
 │                    │ src/engine         │  pure TypeScript, no DOM;  │
 │                    │ bands, comfort,    │  the same code runs in the │
 │                    │ requirements,match │  push Worker and in tests  │
 │                    └────────────────────┘             │              │
 │  Service worker (src/sw.ts): precached app shell,     │              │
 │  network-first copies of weather calls, push events   │              │
 └──────────────┬─────────────────────────────┬──────────┼──────────────┘
                │ forecast, geocoding,        │ /api/*   │
                │ air quality, climate        │          │
                ▼                             ▼          │
   ┌──────────────────────┐   ┌───────────────────────────────────────┐
   │ Open-Meteo           │   │ Cloudflare Pages                       │
   │ (CC BY 4.0)          │   │  static files from dist/               │
   └──────────────────────┘   │  Pages Functions (functions/api):      │
                ▲             │   /api/forecast ──► MET Norway ────────┼──► api.met.no
                │             │   /api/sync/:code ─┐                   │     (CC BY 4.0)
                │             │   /api/push/*  ────┤                   │
                │             └────────────────────┼───────────────────┘
                │                                  ▼
                │                    ┌──────────────────────────┐
                │                    │ D1: layered-db           │
                │                    │  sync_blobs              │
                │                    │  push_subscriptions      │
                │                    │  rate_limits             │
                │                    └────────────▲─────────────┘
                │                                 │ reads due rows,
                │                                 │ marks what it sent
                │             ┌───────────────────┴──────────────┐
                └─────────────┤ layered-push Worker (worker/)    │
          (MET Norway if      │ cron */15, runs src/engine       │──► Web Push services
           Open-Meteo fails)  │ signs with VAPID                 │    (FCM, Mozilla, Apple)
                              └──────────────────────────────────┘
```

## Code map

| Path | What lives there |
|---|---|
| `src/engine` | The advice engine. Pure functions from forecast hours, settings, comfort profile and wardrobe to an `Advice`. No DOM, no I/O. |
| `src/data` | Persistence (`store.ts`, versioned `layered:v1:*` keys in `localStorage`), weather clients (`openmeteo.ts`, `metno.ts`, `cache.ts`), sync and push clients, formatting. |
| `src/state` | Signals that join data to the engine: the current place, the forecast state and the day's advice. |
| `src/screens`, `src/components` | Preact views. Each feature imports its own stylesheet from `src/styles`. |
| `src/sw.ts` | The service worker, built with Workbox in inject-manifest mode. |
| `functions/api` | Pages Functions. Thin handlers; the logic and its tests are in `functions/_lib`. |
| `worker/` | The `layered-push` Worker. Its only entry point is the cron trigger. |
| `migrations/` | D1 schema, shared by the Pages project and the Worker. |
| `tests/e2e` | Playwright smoke test against the built app, with every network call mocked. |

## How advice reaches Today

1. `src/state/forecast.ts` (`loadForecast`) asks `src/data/cache.ts` (`getForecast`) for the current place.
2. `getForecast` serves a copy younger than 15 minutes from `localStorage` without a request. Otherwise it calls Open-Meteo directly from the browser (`fetchForecast`). If that fails it tries `/api/forecast` (`fetchFallback`), which fetches MET Norway on the server, because MET Norway requires an identifying `User-Agent` and caches better at the edge. If both fail, the last good copy is shown and marked stale with its time.
3. `src/state/advice.ts` feeds the forecast hours, settings, comfort profile, learned offsets, routines and wardrobe into `advise()` in `src/engine/advise.ts`.
4. The engine selects the hours you'll be out (`window.ts`), takes the coldest feels-like temperature, applies activity, comfort and learned offsets, picks a band (`bands.ts`), turns it into requirements (`requirements.ts`) and matches them to the clothes you own (`match.ts`). Extras, heads-ups, rain timing and commute legs are added on top.
5. Today renders the `Advice`. Week, the day view, the share poster and trip packing lists call the same engine for other days and places.

## Notifications

1. In Settings → Notifications the app gets a VAPID public key from `/api/push/key`, asks the browser for a push subscription, and posts it to `/api/push/subscribe` with what the Worker needs to run the engine (`SubscribeRequest` in `src/data/push-api.ts`).
2. The Pages Function validates the request (known push hosts only, size cap, rate limit) and upserts a row in `push_subscriptions`. The app keeps only the random id it gets back.
3. Every 15 minutes the `layered-push` Worker reads the subscriptions, works out which are due in each person's own time zone (`worker/src/schedule.ts`), fetches one forecast per place, runs the engine and sends a Web Push message signed with the VAPID private key. The `last_*` columns stop the same push going out twice. A change alert goes out at most once a day, and only when the advice has changed materially since the morning.
4. The service worker shows the notification and opens the app when you tap it.
5. Turning notifications off, or Delete my data, calls `DELETE /api/push/:id`. A push service that answers 404 or 410 also removes the row.

## Sync

1. Settings → Sync creates a 10-character code on the device and `PUT`s the export bundle to `/api/sync/:code`.
2. Another device enters the code and `GET`s the bundle. After that, Sync now compares timestamps and pulls or pushes (last write wins). The server caps how far ahead a client clock may claim to be.
3. Stop syncing can delete the server copy (`DELETE /api/sync/:code`), and Delete my data always does.

The sync and push endpoints share one fixed-window rate limiter. It keys counters by a salted SHA-256 of the client address (`RATE_LIMIT_SALT`), so the table never holds a raw IP.

## Privacy boundaries

What stays on the device:

- Your wardrobe, ratings, history and trips. Your comfort profile, routines and settings too, except for the parts listed under Notifications below.
- Exact location. "Use my location" is rounded to about 1 km before it's stored.

What leaves the device, and only when you use the feature:

| Feature | Goes to | What is sent |
|---|---|---|
| Forecast, place search, air quality, trip climate | Open-Meteo, straight from the browser | Rounded coordinates, or the place name you typed |
| Forecast fallback | `/api/forecast`, then MET Norway from the server | Coordinates rounded to two decimals and your time zone |
| Sync (opt-in) | D1 `sync_blobs` | The export bundle under your sync code; no account, no name, no email. Ratings travel whole, including, since #94, `wornClo` and `targetClo` (the suggested outfit's basic clo and the model's target before the personal bias, on votes given under the thermal model) and `voteCleared` (a temperature vote reset in Settings, kept for its garment marks) |
| Notifications (opt-in) | D1 `push_subscriptions`, then your browser's push service | The push endpoint and keys, rounded coordinates, time zone, schedule, units, activity, time outside, commute, comfort profile, manual offset and engine choice. From your ratings, only derived numbers: the clo bias (how much warmer or cooler you dress), how many votes it rests on, and the summed vote pull per activity, dated at your newest vote. Routines as time, length, days, activity and effort. Not sent: individual ratings, their dates or the clo values kept with them, routine names, wardrobe, learned garment warmth. The server adds only the dates it last sent each kind of notification and the morning's band and rain gear, to spot a change. The row is deleted when you turn notifications off. |
| Any `/api` call | Cloudflare | Your IP address, as for any website; Layered stores only a salted hash in `rate_limits`, in hourly windows |

There is no analytics, no tracking, no third-party script and no account. The Content Security Policy in `public/_headers` limits the browser to this origin and `*.open-meteo.com`.

## Build and deploy

- `npm run build` type-checks and builds `dist/` with Vite, including the service worker and the precache manifest.
- On pull requests, `ci.yml` runs typecheck, lint and unit tests, and `e2e.yml` runs the Playwright smoke test.
- On `main`, `deploy.yml` tests and deploys `dist/` to Cloudflare Pages (Pages Functions ship with it), then applies D1 migrations and deploys the `layered-push` Worker.

Setting this up on your own Cloudflare account is covered in [self-hosting.md](self-hosting.md).
