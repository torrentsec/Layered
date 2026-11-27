# Layered: requirements

This is the single product backlog for Layered. It merges the original build brief with the full weather-to-clothing backlog (stories US-001 to US-060), and records where they conflict and how each conflict was settled.

Status key: **Done** = shipped. **Partial** = shipped, with the gap noted. **Planned** = accepted, not built yet. **Adapted** = accepted in a different form (see the note). **Out** = out of scope.

## 1. Vision and principles

Layered tells you what to wear from the weather, the clothes you own, how you feel the cold, and what you're doing. It is not a stylist. It never suggests colours or encourages shopping.

- **Utility over aesthetics.** Practical layers, not outfits.
- **Low-friction onboarding.** Useful advice before the wardrobe is catalogued.
- **Progressive personalisation.** It gets better with feedback, and never jumps on a single rating.
- **Explainable.** Every recommendation has a plain-language "Why this?".
- **Weather-aware, not temperature-only.** Feels-like, wind, rain timing, hourly change.
- **Inventory-aware.** It never presents clothing you've said you don't own as yours.
- **Honest about uncertainty.** Typical weather, stale data and forecasts are labelled as such.
- **Private by default.** No accounts, no tracking, no third-party scripts. Data stays on the device unless the user turns on sync.
- **Free and open source** (AGPL-3.0-or-later), and runs within Cloudflare's free tier.

## 2. Decisions that settle conflicts

| Topic | Backlog asked for | Decision |
|---|---|---|
| Accounts (US-001, US-057) | Registered accounts with sign-in | **No accounts.** The device holds the profile. An optional 10-character sync code links devices. "Delete my data" wipes the device and any server copies. |
| Analytics (US-050 to US-052) | A product analytics dataset | **On-device only.** The suitability rate, history and engine failures are computed and shown on the phone. Nothing is sent anywhere. |
| Monetisation (E09) | Free and premium tiers | **Out.** Everything is free. A paid tier would need a payments provider and conflicts with the free, open-source aims. |
| Wardrobe model (E02) | A category inventory with thin/medium/thick quantities | **Category inventory**, plus an optional **nickname** on outerwear so Today can still say "your navy puffer". |
| Weather provider | Not specified | **Open-Meteo** as primary (keyless, feels-like, 16 days, air quality, archive). **MET Norway** as an automatic fallback through `/api/forecast`. |

## 3. Engine design (the backlog's section 6, adopted)

The engine is a pure TypeScript domain module (`src/engine`). The app, the tests and the push Worker all share it. It runs in four stages, each independently testable:

1. **Weather interpretation.** Picks the exposure window(s) and reads the coldest feels-like hour, wind, rain timing and the warming across the window. It uses the provider's apparent temperature, which already includes wind and humidity, so wind is never counted twice. If apparent temperature is missing, it falls back to air temperature.
2. **Requirements.** From the effective temperature (weather + activity + comfort profile + learned offset), it derives an **insulation target**, a **rain protection** level, a **wind protection** level, a **footwear** need and whether layers should be **removable**. It knows nothing about the user's wardrobe.
3. **Inventory matching.** Matches the requirements to the garments the user has confirmed they own (category × thickness, with insulation, water and wind properties where given). Unknown is not the same as "don't own".
4. **Recommendation.** Produces base, mid and outer layers, bottoms, footwear and extras, an explanation that separates general advice from inventory-specific advice, any limitations ("no waterproof recorded"), and an alternative combination.

Thresholds are named constants with unit tests, so they can be recalibrated from feedback without touching the UI.

## 4. Backlog by epic

### E01: Onboarding and personal profile

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-001 | Personal profile | P0 | Adapted | The device profile is the profile. The sync code (E10) carries it between devices. |
| US-002 | Primary location | P0 | Done | Search, Home/Work/Gym/custom, switcher on Today, "Use my location". |
| US-003 | Location permission control | P0 | Done | Asked only on tap, with a reason given. Works fully without it. No background tracking. |
| US-004 | Temperature sensitivity (cold / average / warm) | P0 | Done | Three choices that set a base offset. The manual slider stays for fine-tuning. |
| US-005 | Comfort preferences (overheat walking, cold when still, wind/rain tolerance) | P1 | Done | Each adjusts a specific activity offset or threshold. All optional. |
| US-006 | Progressive onboarding | P0 | Done | First run: place, then sensitivity (skippable), then an optional quick wardrobe. Missing data never blocks advice. |

### E02: Clothing inventory

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-007 | Category catalogue | P0 | Done | Base, mid, outer, bottoms, footwear, accessories, using the backlog's taxonomy. |
| US-008 | Quantities per category | P0 | Done | Non-negative whole numbers. 0 means "don't own"; blank means "not set". |
| US-009 | Thin / medium / thick | P0 | Done | Quantities are recorded per thickness. |
| US-010 | Thickness explanations | P0 | Done | Category-specific examples, shown while editing. |
| US-011 | Material | P2 | Done | Optional: wool, cotton, synthetic, fleece, down. |
| US-012 | Water and wind resistance | P1 | Done | Water: none / resistant / waterproof. Wind: low / medium / high. Jackets are never assumed waterproof. |
| US-013 | Insulation separate from thickness | P1 | Done | Optional low / medium / high. Overrides the thickness-based default. |
| US-014 | Edit inventory | P0 | Done | Edited in place, saved automatically. |
| US-015 | Inventory completeness | P1 | Done | Configured vs not set and a completeness bar are done. Still to do: which missing categories matter today. |
| US-016 | Works with a partial wardrobe | P0 | Done | Generic advice works today. The "not set versus don't own" distinction arrives with the category model. |

### E03: Weather intelligence

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-017 | Current weather | P0 | Done | Open-Meteo, location- and time-stamped. Errors and offline states are explained. |
| US-018 | Hourly forecast | P0 | Done | Feels-like, rain chance and amount, wind and gusts, in the location's own time zone. |
| US-019 | Daily forecast | P0 | Done | 16 days, high and low, rain, gusts, sunrise and sunset. |
| US-020 | Feels-like temperature | P0 | Done | No double-counting. Personal offsets applied separately. Inputs inspectable in "Why this?". |
| US-021 | Wind | P1 | Done | Gust warnings, hood instead of umbrella, hat in wind. A separate wind-protection requirement comes with the engine rework. |
| US-022 | Rain | P0 | Done | Probability, amount and timing ("Dry until 15:00, then showers"). |
| US-023 | Meaningful changes | P0 | Done | Swing detection gives "layers you can take off". Commute legs are compared. |
| US-024 | Freshness | P1 | Done | "Last updated" shows when stale or offline. To do: always show the forecast time. |
| US-025 | Forecast uncertainty | P2 | Done | Use model spread where available. Prefer adaptable layers when uncertain. |

### E04: Recommendation engine

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-026 | Required insulation | P0 | Done | Rules-based bands today. To be reworked into an explicit insulation target (section 3). |
| US-027 | Layering requirements | P0 | Done | Base, mid and outer only where needed, with optional layers marked. |
| US-028 | Recommend owned clothing only | P0 | Done | Arrives with the category inventory. |
| US-029 | Right thickness | P0 | Done | Combines thicknesses to meet the target without overshooting. |
| US-030 | Rain protection | P0 | Done | Umbrella, waterproof and hood rules are done. To do: "no waterproof recorded" limitation. |
| US-031 | Footwear | P1 | Done | Waterproof shoes or boots for rain and snow, from owned footwear. |
| US-032 | Daily recommendation | P0 | Done | Today screen with layers, extras and the forecast period. |
| US-033 | Why this | P0 | Done | Coldest hour, offsets and rules fired. To do: separate general advice from inventory-specific advice. |
| US-034 | Alternative combination | P1 | Done | A second, equally suitable combination from owned clothes. Never adds unowned items. |
| US-035 | Insufficient inventory | P0 | Done | Says what's missing, with a link to update it. |

### E05: Personalisation and learning

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-036 | Feedback | P0 | Partial | Too cold / just right / too warm from 18:00. To do: "too many layers" and "not enough protection". |
| US-037 | Correct a garment | P1 | Planned | Mark a recommended layer as too warm or too cool. One correction never becomes a permanent rule. |
| US-038 | Learn from temperature feedback | P1 | Done | ±0.5° per rating, capped at ±5°, decaying with a 30-day half-life. Per-activity offsets after 3 ratings. Resettable. |
| US-039 | Garment-specific warmth | P1 | Planned | Learned warmth per category and thickness, kept separate from personal sensitivity. Reversible. |
| US-040 | Avoid repetition | P2 | Planned | Only between equally suitable alternatives. Can be switched off. |

### E06: Daily experience and notifications

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-041 | Today on open | P0 | Done | |
| US-042 | Notification time | P1 | Done | Morning Web Push at a chosen time and days, in local time (`layered-push` Worker). |
| US-043 | Significant change alerts | P2 | Done | The Worker re-checks after the morning push and alerts only if the advice changes. At most one a day. |
| US-044 | Journey-home warnings | P1 | Done | Commute notes such as "Umbrella for the way home — showers from 17:00". |

### E07: Activities and context

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-045 | Daily activity | P1 | Done | Nine activities, including office day and staying in, with a default and a per-day override. |
| US-046 | Outdoor exposure | P1 | Done | Out for 2, 5 or 10 hours. Standing versus walking offsets. |
| US-047 | Commute configuration | P2 | Done | Times, leg length, days and travel mode (walk, cycle, transport). |
| US-048 | Commute-aware advice | P2 | Done | Dresses for the colder leg and says which leg drives the advice. |

### E08: Recommendation quality (on-device)

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-049 | History | P2 | Planned | The last 60 days of recommendations with their weather and rating, kept on the device. |
| US-050 | Suitability tracking | P0 | Adapted | The on-device suitability rate ("You rated 82% of days just right") in Settings. No analytics. |
| US-051 | Failure tracking | P1 | Adapted | An on-device log of engine failures and incomplete-inventory cases, viewable in Settings and exportable. |
| US-052 | Quality by condition | P1 | Adapted | On-device breakdown by weather band and activity. |

### E09: Subscription and monetisation

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-053 | Free core | P0 | Done | Everything is free. |
| US-054 | Premium personalisation | P2 | Out | See decisions. |
| US-055 | Manage subscription | P2 | Out | See decisions. |

### E10: Reliability, privacy and accessibility

| ID | Story | Pri | Status | Notes |
|---|---|---|---|---|
| US-056 | Persist data | P0 | Done | On the device, plus optional sync with a 10-character code (D1, last write wins). |
| US-057 | Delete my data | P0 | Done | Delete my data removes the server sync copy, push subscriptions, caches and every local key. |
| US-058 | Fast load | P0 | Done | Cache-first forecast (15 minutes), precached app shell. Lighthouse Performance ≥ 90 to be verified. |
| US-059 | Provider outages | P0 | Done | The last good forecast is shown, labelled with its time. To do: MET Norway fallback. |
| US-060 | Accessibility | P1 | Partial | Labels, focus, 44px targets and reduced motion are done. A WCAG 2.2 AA audit is planned. |

### E11: Layered additions (from the original brief)

| Feature | Status |
|---|---|
| Week view (16 days, Tomorrow card, swipe between days) | Done |
| Trips with multiple destinations, typical weather beyond 16 days, totalled packing list | Done |
| Heads-ups (ice, storm, UV, heat, fog), pollen and air-quality chips | Done |
| Installable PWA, own service worker, offline shell, iOS install hint | Done |
| Share poster (1080×1350) | Done |
| Bauhaus design system, light and dark | Done |

### E12: From customer research (November 2026)

Added by the Product Owner at the Sprint 1 Review, from [voice-of-customer research](research/voice-of-customer-2026-11.md).

| ID | Story | Pri | Epic | Status |
|---|---|---|---|---|
| US-061 | Optional evening notification with tomorrow's outfit | P1 | E06 | Done |
| US-062 | Add another person (such as a child) with their own comfort profile | P2 | Household | Planned |
| US-063 | Age-appropriate defaults for a child | P2 | Household | Planned |
| US-064 | Each person's outfit side by side on Today | P2 | Household | Planned |
| US-065 | Saved routines (school run, dog walk, gym) with time, length, days and activity | P1 | E07 | Done |
| US-066 | Dress for the coldest of today's routines and flag the differences | P1 | E07 | Done |
| US-067 | Effort level (easy, steady, hard) for running, cycling and hiking | P1 | E07 | Done |
| US-068 | Rain timing phrased as approximate; far-off days marked less certain | P1 | E03 | Done |
| US-069 | Real temperature shown next to feels-like | P2 | E03 | Done |
| US-070 | Remember the last effort per activity | P3 | E07 | Planned |
| US-071 | Undo deleting a routine | P3 | E07 | Planned |
| US-072 | Opt-in wardrobe-aware notifications (owned categories sent to the Worker) | P2 | E06 | Planned |
| US-073 | Retry a push that failed with a server error; batch large Worker runs | P2 | E06 | Planned |

## 5. Non-functional requirements

| Area | Requirement | How |
|---|---|---|
| Performance | Today renders in under 2 s at P95 from a valid cache | Cache-first data and a precached shell. Checked with Lighthouse (Performance ≥ 90). |
| Availability | 99.5% | Static hosting on Cloudflare Pages. The app works offline from cache. |
| Security | Encrypted in transit and at rest | HTTPS only, plus a CSP and security headers. D1 encrypts at rest. No secrets in the client or the repo. |
| Privacy | Collect only what's needed | Location rounded to 2 decimal places. No identifiers beyond random sync and push IDs. No tracking. |
| Weather integration | Provider failure never crashes the app | Cached fallback, MET Norway fallback, explicit error states. |
| Data quality | Validate inputs | Missing values default safely. Server endpoints validate and cap payloads (256 KB). |
| Accessibility | WCAG 2.2 AA | Audit before v1.0.0. |
| Time zones | Local time everywhere | The engine works on the location's wall-clock time. The Worker sends by the subscriber's time zone. |
| Maintainability | Engine stages testable on their own | Pure functions with unit tests. CI runs typecheck, lint and tests on every pull request. |

## 6. Definition of Done

Acceptance criteria met; unit tests for engine rules; typecheck, lint and tests passing in CI; checked at phone width in light and dark; accessible names and focus order checked; README or this document updated; deployed to production from `main`.

## 7. Success measures (on-device)

The primary measure is the **suitability rate**: the share of rated days marked "just right", shown to the user in Settings. Learning should push it up over time.
