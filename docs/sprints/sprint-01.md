# Sprint 1

**Product Goal:** A free, private app that consistently tells you what to wear from the weather, the clothes you own and how you feel the cold.

## Sprint Planning

### Why: Sprint Goals

- **Team Circle ●:** *Advice uses the clothes you actually own and how you feel the cold.* This is the Product Owner's MVP hypothesis from the backlog: inventory-aware recommendations.
- **Team Square ■:** *Layered keeps working when the weather service doesn't, and can be installed, shared and synced.*

### What: Sprint Backlog

| Item | Stories | Team | Developer | Reviewer |
|---|---|---|---|---|
| #17 Engine stage 2: requirements | US-021, US-026 | ● | dev-01 | dev-02 |
| #18 Engine stage 3: inventory matching | US-028–031, US-034, US-035 | ● | dev-02 | dev-01 |
| #10 Category wardrobe inventory | US-007–016 | ● | dev-03 | dev-05 |
| #16 Onboarding and comfort profile | US-004–006 | ● | dev-04 | dev-03 |
| #19 Today: owned clothes, limitations, alternatives | US-032–035 | ● | dev-05 | dev-04 |
| #20 MET Norway fallback and freshness | US-024, US-059 | ■ | dev-06 | dev-07 |
| #8 Service worker and iOS install hint | E11 | ■ | dev-07 | dev-06 |
| #12 Share poster | E11 | ■ | dev-08 | dev-09 |
| #21 Activities and commute travel mode | US-045, US-047 | ■ | dev-09 | dev-10 |
| #13 D1 sync and Delete my data | US-056, US-057 | ■ | dev-10 | dev-08 |

Not selected, and left in the Product Backlog for the PO to re-order: #14 morning push (needs this Sprint's service worker and D1), and #15 release docs and `v1.0.0`.

### How: contracts

Landed on `main` before any feature branch, so both teams build against the same seams:

- `src/engine/inventory.ts`: catalogue, `Inventory`, `ownership()` (owned, none or unknown), `completeness()`.
- `src/engine/comfort.ts`: `ComfortProfile` and a baseline `comfortOffset()`. dev-04 extends it.
- `src/engine/requirements.ts`: `Requirements` and a baseline `requirementsFor()`. dev-01 refines it; dev-02 matches against it.
- `src/engine/types.ts`: `LayerAdvice` gains category, thickness, nickname and ownership. `Advice` gains `requirements`, `limitations` and `alternatives`.
- `src/data/store.ts`: persisted `inventory`, `comfort` and `onboarded`, included in export, import and sync.
- `src/screens/settings/*`: one file per Settings section, so sync, comfort and notifications don't collide.

### Platform dependency

The Scrum Master provisions `layered-db` (D1) and binds it to the Pages project as `DB` before #13 merges.

## Daily Scrum

**Wave 1.** All ten Developers branched from the contracts commit (`942a127`). Every one of them hit the plan's five-hour usage limit mid-task, which was the Sprint's main impediment. The Scrum Master resumed each from its saved state as soon as requests were accepted again, so no work was lost.

**Wave 1 results, in merge order:**

| PR | Item | Developer | Integration notes |
|---|---|---|---|
| #22 | Activities and commute mode | dev-09 | Clean |
| #23 | Comfort profile and onboarding | dev-04 | Clean |
| #24 | Engine stage 2: requirements | dev-01 | Clean |
| #25 | Share poster | dev-08 | Clean |
| #26 | Today: owned clothes, limitations, alternatives | dev-05 | Clean |
| #28 | Engine stage 3: inventory matching | dev-02 | Rebased. Three seams fixed: the poster still passed wardrobe v1; office day was missing from the comfort groups; a wording test sat on the new band-edge hedge |
| #27 | Own service worker and iOS hint | dev-07 | Rebased over #23 in `App.tsx` |
| #29 | Category wardrobe inventory | dev-03 | `app.css` conflict with #26: both appended at the end of the file. The first resolution dropped a brace, which the build caught |
| #30 | MET Norway fallback and freshness | dev-06 | Rebased |
| #31 | D1 sync and Delete my data | dev-10 | Rebased. The SM applied `0001_init.sql` to production and set `RATE_LIMIT_SALT` |

No fix-up wave was needed: every seam was resolved at integration, within the Sprint's timebox.

## Sprint Review

**Sprint Goals.**
- Team Circle ● **met**: advice now comes from the clothes you own, through the full pipeline (interpret → requirements → match), and your comfort profile changes the effective temperature.
- Team Square ■ **met**: MET Norway takes over when Open-Meteo fails, the app has its own service worker with push handlers, it installs on iOS with a hint, it shares a poster, and it syncs with a code and deletes your data on request.

**Increment.** 10 of 10 selected items are Done and deployed to production from `main`. The test count went from 111 to 360. Release `v0.3.0`.

**Inspected:** typecheck, lint, the full test suite and the build on the integrated `main`; screens at 390px in light and dark (Wardrobe, onboarding, Today with an inventory, Why-this, Settings → Sync); the production deploy.

**Product Backlog adapted by the PO:**
- **Statuses.** 23 stories moved to Done in `docs/requirements.md`, and US-015 is Partial (still to do: which missing categories matter today).
- **New research stories.** US-061 to US-069 come from [customer research](../research/voice-of-customer-2026-11.md): evening notification, household and kids, routines, effort level, honest rain timing, and the real temperature next to feels-like.
- **Follow-ups found in review:**
  - Week shows wardrobe nicknames.
  - Choosing Office day or Staying in sets "Out for".
  - Drop the waterproof chip when the outer layer is already waterproof.
  - The push delete on the server goes with #14.
- **Credit.** MET Norway (CC BY 4.0) is credited in About.

**Stakeholder feedback:** asynchronous. The maintainer reviews the deployed Increment on waking.

## Sprint Retrospective

**What went well**
- Contracts first worked: ten branches built against the same seams, and six merged with no conflicts.
- Pure helpers kept everything testable. Several Developers moved logic out of components into `src/data/*` without being asked (`advice-text`, `inventory-edit`, `installHint`).
- The Definition of Done held: every PR arrived green, with tests at the threshold edges.

**What didn't**
- **Usage limit.** All ten Developers stopped at once on the usage limit. Running all of them at full scope was too much in one go.
- **Shared-union changes.** Cross-item seams (a new `Activity`, a renamed engine input) surfaced only at integration, because nobody owned the "who else uses this?" check.
- **CSS appends.** Two branches appending to the end of `app.css` is a guaranteed conflict.
- **Integration in the main checkout.** The SM's integration ran in the main checkout while Developer worktrees still held the branches, which briefly confused which tree had been checked.
- **Tag pushes blocked.** The environment blocks tag pushes, so release tags can't be published from here.

**Improvements committed for Sprint 2** (tracked in [improvements.md](../improvements.md))
1. **Limit concurrency to five Developers per wave**, with tighter briefs. Waves are staggered, not all at once.
2. **Shared-contract rule.** Any change to a shared union or engine input lists every call site in the PR, found with `rg`, and updates them in the same branch.
3. **One stylesheet per feature** (`src/styles/<feature>.css`), imported by its screen. No more appending to `app.css`.
4. **A dedicated integration worktree** for the SM. Developer worktrees are removed as soon as their PR merges.
5. **Production smoke test.** Allow the session to reach the deployed site, so each Review checks `/api/sync` and `/api/forecast` on production rather than only locally.
