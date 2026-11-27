# Sprint 3

**Product Goal:** A free, private app that consistently tells you what to wear from the weather, the clothes you own and how you feel the cold.

## Sprint Planning

### Why: Sprint Goals

- **Team Circle ●:** *Layered learns from your corrections and shows its track record.*
- **Team Square ■:** *Release-ready: accessible to everyone, fast, documented and tested end to end.* The Increment that meets both goals is `v1.0.0`.

### What: Sprint Backlog

| Item | Stories | Team | Developer | Reviewer |
|---|---|---|---|---|
| #47 Richer feedback, garment corrections, learned garment warmth | US-036, US-037, US-039 | ● | dev-02 | dev-04 |
| #48 On-device history and track record | US-049, US-050, US-051, US-052 | ● | dev-04 | dev-02 |
| #49 Accessibility audit and fixes (WCAG 2.2 AA) | US-060 | ■ | dev-06 | dev-08 |
| #50 Performance, Lighthouse CI, per-component styles | NFR performance | ■ | dev-08 | dev-06 |
| #15 Release docs, architecture and end-to-end smoke test | Release | ■ | dev-09 | dev-04 |

Five Developers (improvement 4, kept).

### How: contracts

- `GarmentCorrection`; `Rating.detail` and `Rating.corrections` (`src/engine/types.ts`).
- `garmentWarmth` (learned warmth per category and thickness) and `history` (`DayRecord`, last 60 days), both persisted and included in export, import and sync (`src/data/store.ts`).

### Hot-spot ownership (improvement 11)

`src/screens/Today.tsx`, `src/screens/DayView.tsx` and `src/components/SharePoster.tsx` belong to **dev-06** this Sprint. Others don't edit them: feedback UI goes in `components/TodayExtras.tsx` (dev-02), and history is recorded from `src/state/` (dev-04).

### Applying last Sprint's improvements

| # | Improvement | How it shows up |
|---|---|---|
| 10 | Each feature imports its own stylesheet from its component | dev-08 moves the existing imports; the brief requires it for new CSS |
| 11 | One owner per hot-spot file | dev-06 owns `Today`, `DayView` and `SharePoster` |
| 12 | Each worktree installs its own dependencies | In the brief |
| 9 | Skills and Graphify from the start | In the brief, with the required skills for each kind of work |

## Daily Scrum

**Mid-wave check.** The SM inspected the two worktrees still open. dev-06 (accessibility) and dev-08 (performance) both had `App.tsx`, `AdviceParts.tsx` and `package.json` open. Both were asked to keep to separate concerns: dev-06 to accessibility attributes, dev-08 to lazy-loading mechanics and a single import line. dev-08 was also asked to prove that lazy tabs keep the new e2e test green.

**Integration.**

| PR | Item | Developer | Notes |
|---|---|---|---|
| #53 | History and track record | dev-04 | Clean |
| #52 | Release docs, architecture, e2e | dev-09 | Clean; added the `smoke` CI job |
| #54 | Feedback and garment learning | dev-02 | Stacked on #53: Settings sections combined ("learned" before "record"). The SM's integration worktree had stale dependencies after #52 added Playwright types, so it reinstalled |
| #55 | Performance and Lighthouse CI | dev-08 | Clean; added the `lighthouse` CI job |
| #56 | Accessibility (WCAG 2.2 AA) | dev-06 | Clean. The SM wired `test:a11y` into the e2e workflow, freed a port held by a leftover preview server, and confirmed zero serious or critical violations |

Only one seam, a single line in Settings. That's the lowest yet.

## Sprint Review

**Sprint Goals.**
- Team Circle ● **met**: richer feedback, garment corrections and learned garment warmth used in matching (#54); on-device history and track record (#53).
- Team Square ■ **met**: WCAG 2.2 AA audit with automated axe checks in CI (#56); Lighthouse at 100 on every category, with budgets in CI (#55); release README, architecture and self-hosting docs, and an e2e smoke test in CI (#52).

**Increment.** 5 of 5 items Done. Tests went from 630 to 698 unit tests, plus 5 e2e tests, 17 × 2 × 2 axe screen checks and Lighthouse budgets. Every pull request now runs four CI jobs: `check`, `smoke` (e2e plus axe), `lighthouse`, and the deploy. **Release `v1.0.0`.**

**Inspected in production:**
- The page, the service worker, `humans.txt` and the HTML signature.
- `/api/push/key`, `/api/forecast` (MET Norway), and a full `/api/sync` round trip.
- The live site in a browser with **real weather**: Woolwich, feels −2° to −1° (actual 2° to 3°), "Bundle up", no console errors.

**Hygiene before release:**
- All 45 commits are authored by torrentsec.
- 0 matches for tool or AI references or attribution trailers in the tree or commit messages.
- 0 secrets in the tree.
- No foreign signatures: squash merges are GitHub-signed, the rest are unsigned.

**Product Backlog adapted by the PO:**
- Statuses: US-036, US-037, US-039, US-049–US-052 and US-060 move to Done.
- New items:
  - **US-074** "General advice" tags flood an empty wardrobe; show one hint instead (found at this Review).
  - **US-075** Record the day for the activity chosen on Today, not only the default.
  - **US-076** "Not enough protection" feedback changes advice.
  - **US-077** Lazy-load the poster code.
  - **US-078** Text that scales with the system text size (rem units).
  - **US-079** Screen-reader passes with VoiceOver and TalkBack.

## Sprint Retrospective

**What went well**
- **Fewest seams yet.** Hot-spot ownership and per-component styles left one integration seam, down from 7 in Sprint 2 and 4 in Sprint 1.
- **Skills and Graphify from the start.** Every Developer used the required skills and Graphify, named them in their report, and fixed what `code-review` found (dev-04, dev-08).
- **Quality moved into automation.** Three new CI jobs now guard the Definition of Done: e2e, axe and Lighthouse.
- **Improvement #12 held.** No dependency links were committed.

**What didn't**
- **Stale dependencies.** The SM's integration worktree had stale dependencies after a merge that added packages, producing 17 false type errors until a reinstall.
- **Leftover processes.** A preview server from a Developer's session held a port the axe check needed.
- **A 6-hour gap.** The session restarted mid-Sprint. Nothing was lost, because all state lived in git and the Sprint doc, but nothing moved for those 6 hours.

**Improvements committed for Sprint 4**
1. The integration worktree reinstalls dependencies whenever `package-lock.json` changes on `main`, before running checks.
2. Developers stop any servers they start before reporting (in the brief), and the SM clears leftover preview processes before each integration.
3. Keep "state lives in git" as an explicit practice: every Sprint decision lands in the Sprint doc or the improvement log the moment it's made.
