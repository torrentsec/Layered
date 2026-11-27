# Changelog

All notable changes are listed here, grouped by release (one release per Sprint from 0.3.0). The format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.4.0] — Sprint 2

### Added
- Morning and evening notifications: Settings → Notifications, the `/api/push/*` API, and the `layered-push` Worker (every 15 minutes, in your own time zone), with at most one alert a day if the advice changes.
- Routines (school run, dog walk) with Today dressing for the coldest of them; effort level for running, cycling and hiking.
- Rain timing phrased as approximate, with its chance; certainty markers on far-off days; the real temperature next to feels-like.
- Wardrobe tells you which unset categories matter today; Week names your own coat.

### Fixed
- The MET Norway fallback failed in production (#33).
- A stray `node_modules` link in the repository (#40).

## [0.3.0] — Sprint 1

### Added
- Category wardrobe inventory: quantities per thickness, "don't own" kept separate from "not set", insulation, water and wind properties, materials, outerwear nicknames, a completeness bar, and migration from v1 named items.
- Engine stages 2 and 3: requirements (insulation target, wind protection, rain tolerance, footwear, bottoms, removable layers) matched to the clothes you own, with limitations and an alternative.
- Comfort profile (feel the cold, average, run warm, plus preferences) and a skippable first-run flow.
- Today shows your own clothes, wardrobe gaps, a Suggested/Alternative switch and a clearer "Why this?".
- Office day and Staying in activities; commute travel mode.
- MET Norway fallback through `/api/forecast`; "Updated HH:MM" always shown.
- Own service worker with push handlers; one-time iOS install hint.
- Share the day as a 1080×1350 poster.
- Sync between devices with a code (D1); Delete my data.

## [0.2.0] — pre-Scrum

### Added
- Settings: saved places (Home, Work, Gym), units, defaults, commute days, manual offset, theme, JSON export and import, About.
- Trips with multiple destinations: forecast within 16 days, typical weather beyond, and one packing list across every stop.
- Today: end-of-day feedback, Layered heads-ups, pollen and air-quality chips, commute legs.
- Wardrobe of named items.
- `docs/requirements.md`: the merged product backlog.

## [0.1.0] — pre-Scrum

### Added
- Advice engine with unit tests.
- Today and Week screens, Why-this sheet, light and dark themes.
- Installable PWA build, security headers.
- CI on pull requests and deploy to Cloudflare Pages from `main`.
