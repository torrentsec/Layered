# Sprint 5

**Sprint Goal:** the science engine gives real advice behind a flag, and beats the band engine on the golden days.

## Sprint Planning

### Why: Sprint Goal

Sprint 4 made the thermal model compute the right numbers. This Sprint turns those numbers into a verdict, layers and an explanation people can read, behind a developer flag so old and new can be compared before the switch-over.

### What: Sprint Backlog

| Issue | Item | Developer | Team |
|---|---|---|---|
| #67 | S7a clothing target and verdict bands from clo | dev-06 | Square ■ |
| #68 | S7b forecast hours to thermal weather, with cycling air speed | dev-08 | Square ■ |
| #69 | S7c science engine behind a flag in requirements | dev-07 | Square ■ |
| #70 | S8b personal clo bias learned from stored votes | dev-09 | Square ■ |
| #71 | S9 "Why this?" in clo and UTCI, real temperature beside feels-like | dev-10 | Square ■ |

Hot-spot owner for `Today` and `DayView` this Sprint: dev-10.

### How: the Developers decide

The SM gives each item its outcome and acceptance, not its design (improvement 19). The Developers agree the how on the wave's team board: who writes which shared piece, which paths others import from, and who reviews whom. #69 depends on #67 and #68, so its Developer codes against their claimed interfaces with test doubles until those land.

Peer review rotation: dev-06 → dev-07 → dev-08 → dev-09 → dev-10 → dev-06.

### Golden days (PO, written before implementation)

Each is a fixture through the full pipeline, a 30-minute walk unless stated, a person with no bias and a complete inventory. The band engine's answer is recorded alongside for comparison; the science engine must give the expected verdict.

| Day | Weather | Expected verdict | Must also say |
|---|---|---|---|
| London, 26 Nov | 3 °C, 25 km/h wind, showers, overcast | `coat` | Waterproof outer |
| Mild and sunny | 15 °C, light wind, clear, midday | `two` | Two light layers, nothing heavy |
| Madrid, summer | 28 °C, calm, clear, UV 8 | `tshirt` | Sunscreen |
| Oslo, January | −10 °C, 15 km/h wind, dry, overcast | `bundle` | Hat and gloves |
| Sun against cloud | 8 °C calm and clear at noon, against 8 °C, 30 km/h wind and overcast | The clear day is at least one band lighter | — |
| Cycling | London day, cycling 30 minutes instead of walking | Same or warmer verdict than walking, never lighter | Windproof outer |

### Applying last Sprint's improvements

| # | Improvement | How it shows up |
|---|---|---|
| 16 | Re-index Graphify at `main` at Planning | **Blocked.** The index is still at `e4ea976` and pushes aren't re-indexing it; only the maintainer can trigger a rebuild. Developers use `rg` for `src/engine/science/` until it updates |
| 17 | Run formulas against their acceptance tests before writing them down | The golden days above are written as tests to run, with inputs and expected outputs |
| 18 | Confirm external field names live at Planning | Done: the six Open-Meteo names match Open-Meteo's own documentation source, and production's MET Norway fallback carries `rh` and `cloud` |
| 19 | Developers self-manage the how | Team board, claims, ask-don't-copy, peer review rotation |

### Sprint 4 Review follow-up

Production smoke test after the Sprint 4 deploy: page, `/api/push/key`, `/api/forecast` (now with `rh` and `cloud`) and `/api/sync` all return 200.

## Daily Scrum

_Recorded per wave._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
