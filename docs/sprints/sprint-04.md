# Sprint 4

**Product Goal:** A free, private app that consistently tells you what to wear from the weather, the clothes you own and how you feel the cold.

**Epic:** #58, physiology-based clothing engine. The refinement spike (#59) produced `docs/science/thermal-model.md`, `docs/science/backlog.md` and reference fixtures from pythermalcomfort 4.8.1.

## Sprint Planning

### Why: Sprint Goals

The epic's ten stories form a dependency chain, so they're split across two Sprints, each with a goal it can meet:

- **Sprint 4 (this one), both teams:** *The science engine computes the right numbers.* Every module matches the reference vectors within the stated tolerances. Nothing user-facing changes yet.
- **Sprint 5:** *Advice comes from the science engine.* The clothing target and verdicts (behind a flag, compared old against new on the golden days), "Why this?", then the switch-over.

### What: Sprint Backlog

| Item | Stories | Team | Developer | Reviewer |
|---|---|---|---|---|
| #60 UTCI polynomial and categories; personal clo bias (Kalman) and migration | S1, S8 | ● | dev-02 | dev-03 |
| #61 IREQ, DLE and the lightest-clo solver | S2 | ● | dev-03 | dev-02 |
| #62 Clothing table, ensemble and resultant insulation; metabolic rates | S3, S6 | ● | dev-04 | dev-05 |
| #63 Sun position, mean radiant temperature, cloud fallback | S4 | ■ | dev-05 | dev-04 |
| #64 Forecast variables: Open-Meteo, MET Norway, Worker | S5 | ■ | dev-01 | dev-10 |

S0 (contracts) was done in Planning. S7 and S9 go to Sprint 5.

### How: contracts (on `main` before branching)

- `src/engine/science/types.ts`: every type, plus a function type alias per module signature. Each module is a separate file owned by one Developer, so there are no shared files.
- `Hour` gains optional `rh`, `cloud`, `ghi`, `direct`, `diffuse` and `dni`. They're optional, so no call sites change.
- Fixtures in `src/engine/science/__fixtures__/`, imported directly by tests.

### PO decisions on the spike's open questions

1. **Target:** comfort (IREQ neutral) for the actual time outside, with IREQ minimum as a floor.
2. **10–20 °C:** IREQ is extended to 20 °C as a documented variant, checked by the fixtures and the UTCI category.
3. **Headline:** UTCI replaces apparent temperature as "feels like"; the actual temperature stays alongside.
4. **Clo in the UI:** plain words first; clo appears only in the "Why this?" detail.
5. **Shade:** an open site is assumed; a "mostly in shade" option goes to the backlog.
6. **Existing learning:** migrated at 0.07 clo per °C as the Kalman filter's starting point.
7. **Golden days** for S7:
   - cold, windy and wet (3 °C, 25 km/h, rain) → warm coat and waterproof;
   - mild and sunny (15 °C, clear) → two light layers;
   - hot with high UV (28 °C, UV 8) → T-shirt and sunscreen.
8. **Estimates:** estimated garment clo values and wet-clothing factors are accepted until votes tune them.

### Impediment cleared at Planning

The spike couldn't reach the primary sources. The SM allowed `link.springer.com`, `pmc.ncbi.nlm.nih.gov`, `core.ac.uk`, `pythermalcomfort.readthedocs.io` and `www.utci.org`, so Developers can verify formulas against the papers.

### Applying last Sprint's improvements

| # | Improvement | How it shows up |
|---|---|---|
| 13 | Reinstall dependencies when the lockfile changes | The integration worktree runs `npm ci` before checks |
| 14 | Stop the servers you start | In the brief; the SM clears leftover previews before integrating |
| 15 | State lives in git | PO decisions recorded here at Planning |

## Daily Scrum

_Recorded per wave._

## Sprint Review

_After the Increment is deployed._

## Sprint Retrospective

_After the Review._
