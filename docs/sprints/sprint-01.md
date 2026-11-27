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

_Recorded per wave below._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
