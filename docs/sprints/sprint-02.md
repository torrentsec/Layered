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
| #35 Notification settings and subscribe flow | US-042, US-061 | ■ | dev-07 | dev-10 |
| #36 Routines and effort level | US-065, US-066, US-067 | ● | dev-01 | dev-03 |
| #37 Honest rain timing, real temperature, certainty | US-068, US-069, US-025 | ● | dev-05 | dev-01 |
| #38 Sprint 1 follow-ups and "missing for today" | US-015 + review findings | ● | dev-03 | dev-05 |

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

_Recorded per wave._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
