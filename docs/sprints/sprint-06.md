# Sprint 6

**Sprint Goal:** the science engine is the default, and every screen and notification agrees with it.

## Sprint Planning

### Why: Sprint Goal

Sprint 5 showed the science engine meets every golden day and beats the band engine on cold, wet and sunny days. This Sprint makes it the advice everyone gets, and removes the places where two engines could disagree.

### What: Sprint Backlog

| Issue | Item | Developer | Team |
|---|---|---|---|
| #78 | Science engine by default, with a Settings choice for one Sprint | dev-02 | Circle ● |
| #77 | Routines use their own length as time outside; feels-like merged across legs | dev-01 | Circle ● |
| #79 | Feels-like (UTCI) on the hero and hourly strip | dev-03 | Circle ● |
| #80 | One engine everywhere: Week, Trip, poster, history, notifications | dev-04 | Circle ● |
| #81 | Tech debt D7 and D6: smaller saved forecasts, tidy science tests | dev-05 | Circle ● |

Hot-spot owner for `Today` and `DayView`: dev-03. Peer review rotation: dev-01 → dev-02 → dev-03 → dev-04 → dev-05 → dev-01.

### How

The Developers agree the how on the team board. The SM sets outcomes and acceptance only.

### Acceptance (PO)

- A user with no engine setting gets science advice; the six Sprint 5 golden days pass through the default path.
- Switching to simple bands in Settings gives exactly the Sprint 5 band answers.
- A notification and Today give the same verdict for the same place and hour.
- Twenty saved places with full forecasts stay well inside browser storage, and forecasts saved before this Sprint still load.

### Applying last Sprint's improvements

| # | Improvement | How it shows up |
|---|---|---|
| 20 | Merge, don't rebase, once pushed | In the brief |
| 21 | Depend on commits posted as Stable on the board | In the brief and the board format |
| 22 | Sprint PR merged with a merge commit | Integration plan |

### New practice: interaction logs (stakeholder request)

Every agent logs its interactions with other agents in `docs/team/logs/` (see [process](../process.md#interaction-logs)). Sprint 5 is back-filled from its board.

## Daily Scrum

_Recorded per wave._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
