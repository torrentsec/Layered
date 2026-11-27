# Performance

Layered has to open fast on a phone at the door. This page records how it is measured and what the numbers were for `v1.0.0`.

## How it is measured

`npm run lighthouse -- <url>` (`scripts/lighthouse.ts`) runs Lighthouse 13 against a served `dist`:

- mobile emulation with Lighthouse's default simulated throttling (slow 4G, 4x CPU slowdown);
- a fixture forecast (cold, showers every other evening) and a home place are written to `localStorage` before any app code runs, and every request to `*.open-meteo.com` is answered locally, so the run never touches the weather service;
- three runs, median score per category (`LH_RUNS` changes the count);
- after the runs, Chrome's own installability check (`Page.getInstallabilityErrors`) must come back empty. Lighthouse 12 dropped its PWA category, so this replaces it.

Budgets live in `lighthouse-budgets.json`. The `lighthouse` job in CI runs the same script on every pull request and fails when a median score falls below its budget or the app stops being installable. Reports are kept as the `lighthouse-report` artifact.

Locally:

```sh
npm run build
npx vite preview --port 4173 &
CHROME_PATH=/path/to/chrome npm run lighthouse -- http://localhost:4173
```

## Budgets

| Category | Budget |
|---|---|
| Performance | 90 |
| Accessibility | 95 |
| Best Practices | 90 |
| Installable | no installability errors |

## Before and after (#50)

Today screen, median of runs, same machine and script.

| | Before | After |
|---|---|---|
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO (not budgeted) | 91 | 91 |
| Installable | yes | yes |
| First / Largest Contentful Paint | 0.75 s | 0.75 s |
| Total Blocking Time | 16 ms | 18 ms |
| Cumulative Layout Shift | 0.001 | 0 |
| Start-up JS (gzip) | 53.5 kB | 40.7 kB (with #53 and #54 included) |
| Unused JS at load | 29 kB | 0 kB |
| Jost 500 request starts | ~95 ms | ~30 ms |

The app already met every budget; the changes keep it there as features grow.

## What changed

- **Per-tab code splitting.** Only Today ships in the start-up bundle. Week, Trip, Wardrobe and Settings load on first visit (`src/App.tsx`); the service worker precaches every chunk, so once it is installed a tab switch never waits on the network.
- **Push resubscription after load.** `watchPushSettings` is imported after the `load` event instead of from the entry, so the Notifications section stays out of the start-up bundle.
- **Font preload.** The Jost 500 `woff2` that sets the hero is preloaded from `index.html` with `crossorigin`, so it no longer waits for the stylesheet to parse. The `@font-face` rules from `@fontsource/jost` already use `font-display: swap`. 400 and 700 are not preloaded: they are not on the first screen and would compete for bandwidth.
- **Per-component stylesheets.** Feature CSS is imported by the component that renders it (`AdviceParts`, `Wardrobe`, `settings/Notifications`, `settings/Routines`), so lazy tabs bring their own styles and `src/main.tsx` imports only `app.css`.

## Known leftovers

- Lighthouse reports about 150 ms of render-blocking CSS on simulated slow 4G (one 4 kB stylesheet). Inlining it would need a build step for critical CSS; not worth it while Performance sits at 100.
- `poster.ts` (share poster drawing, about 3 kB gzip) is still in the start-up bundle because `SharePoster` imports it statically.
- SEO is 91 because `robots.txt` is served by the SPA fallback as HTML. It is not budgeted.
