# Sprint 2

**Product Goal:** A free, private app that consistently tells you what to wear from the weather, the clothes you own and how you feel the cold.

## Sprint Planning

### Why: Sprint Goals

- **Team Square ■:** *Layered reaches you before you leave.* Morning and evening notifications, using the same engine as the app.
- **Team Circle ●:** *Advice fits your real day and is honest about uncertainty.* Routines, effort level, approximate rain timing and the real temperature next to feels-like.

### What: Sprint Backlog

| Item | Stories | Team | Developer | Reviewer |
|---|---|---|---|---|
| #14 Push backend: Worker, subscriptions, VAPID | US-042, US-043, US-061 | ■ | dev-10 | dev-07 |
| #36 Notification settings and subscribe flow | US-042, US-061 | ■ | dev-07 | dev-10 |
| #37 Routines and effort level | US-065, US-066, US-067 | ● | dev-01 | dev-03 |
| #38 Honest rain timing, real temperature, certainty | US-068, US-069, US-025 | ● | dev-05 | dev-01 |
| #39 Sprint 1 follow-ups and "missing for today" | US-015 + review findings | ● | dev-03 | dev-05 |

Five Developers, not ten (retro improvement 4). The other five carry no Sprint work and are free for refinement.

### How: contracts (on `main` before branching)

- `src/data/push-api.ts`: the app ↔ Functions ↔ Worker contract (routes, `SubscribeRequest`, `PushSchedule`, `PushProfile`, `PushPayload`).
- `src/data/store.ts`: `NotifyPrefs` gains evening and change-alert options; `Routine` and a persisted `routines` list, included in export, import and sync.
- `src/engine/types.ts`: `Effort` (easy, steady, hard).
- Styles split into `app.css`, `advice.css` and `wardrobe.css`. New features add their own file (retro improvement 6).

### Platform (Scrum Master)

- Create the `layered-push` Worker's secrets after its first deploy. The VAPID pair is generated inside Cloudflare, and the private key is never written anywhere else.
- Apply migration `0002` to production `layered-db`.

### Applying last Sprint's improvements

| # | Improvement | How it shows up this Sprint |
|---|---|---|
| 4 | At most five Developers per wave | Five items selected |
| 5 | Shared-contract rule | In the brief: a PR that changes a shared type lists its `rg` call sites |
| 6 | One stylesheet per feature | Split done in this planning commit; in the brief |
| 7 | Dedicated integration worktree | The SM plans and integrates in `/home/user/integration` |
| 8 | Production smoke test | Ran at the Sprint 1 Review and found #33; runs again at this Review |

## Daily Scrum

### Mid-wave check

Held without interrupting the Developers: the SM inspected each worktree's changes against the Sprint Goals.

| Developer | Item | Progress | Notes |
|---|---|---|---|
| dev-10 | #14 push backend | Researching Web Push encryption and the Worker setup; no files yet | Largest item. On track if the library choice settles early |
| dev-07 | #36 notification settings | `push.ts`, the Settings section and `notifications.css` in progress | Builds against `push-api.ts`; no dependency on dev-10 until integration |
| dev-01 | #37 routines and effort | `activity.ts`, `routines.ts` and `advise.ts` in progress | |
| dev-05 | #38 honest forecast | `rain.ts`, `certainty.ts`, `notify.ts` and `commute.ts` in progress | |
| dev-03 | #39 follow-ups | `match.ts`, `gaps.ts` and `advise.ts` in progress | |

**Impediments and adaptations:**
- **Overlap in `advise.ts`** (dev-01 and dev-03) and **in `commute.ts`** (dev-05 and dev-01). Both were asked to keep shared edits to the minimum: dev-01 adds only `effort` to `advise.ts` and keeps leg logic in `routines.ts`; dev-03 keeps chip logic in `match.ts` and `gaps.ts`.
- **`main.tsx` style imports** will collide trivially between features; the SM resolves them at integration.
- **SM hygiene.** The main checkout was left on a merged fix branch. It's reset to `main`, merged branches are deleted, and the integration worktree is now `integration/sprint-2`.

### Integration check (after dev-03, dev-05 and dev-07 reported)

- **Impediment, caused by the SM:** #35 tracked a `node_modules` symlink. `.gitignore`'s `node_modules/` only matches directories, so the link slipped in, and on checkout it replaced the real folder with a self-loop. That broke `npm` for everyone. All three Developers raised it and worked around it with a local `npm ci`. Fixed by hotfix #40 within the Sprint; the brief now says never to link dependencies.
- **New team agreement** (stakeholder request): every Developer uses the relevant skills and Graphify. The two still working were told mid-wave. For the three already done, the SM applied the agreement at review:
  - **Graphify.** `graphify_impact LayerAdvice` showed `match.ts`, `bands.ts` and `inventory.ts`, all tested. `graphify_callers rainSummary` showed only `DayView` and tests.
  - **`code-review` skill** (low) on the integrated stack, in two passes: no findings.
- **Stacked integration** #39 → #38 → #36: two seams.
  - Week's subline: combined dev-03's owned-outer text with dev-05's certainty marker.
  - `main.tsx` style imports: both kept. Per-feature stylesheets still collide when they're all imported from one file, so this goes to the retro.
- Combined tree: typecheck 0, lint 0, **478 tests**, build green.

**Merge order planned for integration:** #39 (engine fixes) → #38 (wording) → #37 (routines) → #36 (settings UI) → #14 (backend, then the platform steps).

### Final integration

| PR | Item | Developer | Integration notes |
|---|---|---|---|
| #41 | Follow-ups and what's missing today | dev-03 | Clean |
| #42 | Honest rain timing, certainty, real temperature | dev-05 | Week subline combined with #41 |
| #43 | Notification settings | dev-07 | `main.tsx` style imports combined |
| #44 | Routines and effort | dev-01 | Four seams (SharePoster, `main.tsx`, Settings sections, DayView's feels line) combined with #41–#43 |
| #45 | Push backend and Worker | dev-10 | Clean. CI deployed `layered-push` and applied `0002` |
| #40 | Hotfix: untrack `node_modules` link | sm | Impediment caused by the SM |

**Platform (SM):** the VAPID key pair was generated inside Cloudflare. The private key went straight to a Worker secret and was never seen or stored elsewhere; the public key went to the Worker and to the Pages environment.

## Sprint Review

**Sprint Goals.**
- Team Square ■ **met**: morning and evening notifications are live end to end. The subscribe flow (#43), the API and the `layered-push` Worker running every 15 minutes in production (#45), and the keys are all in place.
- Team Circle ● **met**: routines and effort level (#44), approximate rain timing with its chance, certainty markers and the real temperature (#42), and the Sprint 1 follow-ups (#41).

**Increment.** 5 of 5 items Done. The test count went from 361 to 630. Release `v0.4.0`.

**Inspected:**
- typecheck, lint, tests and build on every integration step;
- `wrangler deploy --dry-run` for the Worker (18.6 KB gzipped);
- the Worker deployed with its cron;
- D1 migrations `0001` and `0002` recorded in production;
- the production smoke test (below).

**Product Backlog adapted by the PO:**
- **Statuses.** US-015, US-025, US-042, US-043, US-061, US-065–US-069 move to Done.
- **New items from review:**
  - Remember the last effort per activity.
  - Undo deleting a routine.
  - Opt-in wardrobe-aware notifications (the Worker gets owned categories only).
  - Retry a push that failed with a 5xx.
  - Batch large Worker runs under the subrequest limit.
- **PO decisions recorded:**
  - Evening "days" means the days being dressed for.
  - Push endpoints are restricted to the major push services.

## Sprint Retrospective

**What went well**
- Limiting the wave to five Developers held: nobody hit the usage limit, and every item landed.
- **Skills and Graphify (new team agreement, adopted mid-Sprint):**
  - The two Developers still working used the Cloudflare skills, accessibility-audit, modern-web-guidance and code-review, and checked call sites with `graphify_callers` and `graphify_impact`.
  - The SM applied the same checks when reviewing the three items that finished first.
- **Strict testing caught what normal tests miss.** dev-10 matched RFC 8291's worked example byte for byte. The #33 regression test from Sprint 1's Review pattern (stubbing the runtime's strictness) is now a habit.
- **Stacked integration** in a dedicated worktree surfaced every seam before anything reached `main`.

**What didn't**
- **SM error:** a symlink created for convenience was committed and broke `npm` for every Developer. They worked around it, but it cost each of them time.
- **Style imports still collide.** Per-feature stylesheets stopped the `app.css` conflicts, but importing them all from `main.tsx` moved the collision there: three of five PRs conflicted on it.
- **Cross-cutting edits to `Today`, `DayView` and `SharePoster`.** Four of five items touched at least one of them; those three files are now the product's hot spots.
- **Late agreement.** The skills and Graphify agreement arrived mid-Sprint, so three Developers had finished before it existed.

**Improvements committed for Sprint 3** (tracked in [improvements.md](../improvements.md))
1. **Each feature imports its own stylesheet** from its component, not from `main.tsx`.
2. **Hot-spot ownership.** When several items need `Today`, `DayView` or `SharePoster`, one Developer owns the file for the Sprint and the others hand over small, named changes.
3. **The integration worktree installs its own dependencies.** No links in tracked trees, ever (already in the brief).
4. **Skills and Graphify from the start:** the brief lists the required skills per kind of work, and reports must name them.
