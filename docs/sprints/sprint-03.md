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

_Recorded per wave._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
