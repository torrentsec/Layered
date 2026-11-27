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

One build wave of five Developers, all in their own worktrees. The SM held a stand-up at each hand-back and stacked each branch onto `integration/sprint-4` as it landed.

| Developer | Item | State at hand-back | Decisions and blockers raised |
|---|---|---|---|
| dev-01 | #64 forecast variables | Done | Open-Meteo docs blocked; variable names match the spike. Live check refused by the daily quota, so it carries to Sprint 5 Planning |
| dev-05 | #63 radiation | Done | **PO:** the night cap also applies to estimated (MET Norway) hours. SolarCal cross-check left out: it uses different geometry, 6–38 K apart in strong sun |
| dev-02 | #60 UTCI and bias | Done | **PO accepted** an optional `BiasState.dayMean`: the backlog's update formula failed its own order-independence test |
| dev-04 | #62 clothing and metabolic | Done | Four spike errors corrected (Compendium code 17190, walking M 157.5, walk bound capped at 1.2 m/s, umbrella 0 clo). **PO accepted** the estimated wet factors for water-resistant outers |
| dev-03 | #61 IREQ and DLE | Done | Qlim unit in the docs corrected to 40 W·h/m². "Minimal floor" read as DLE_min for the same exposure |

Integration seam (1): `clothing.ts` carried a private copy of `windAtBody` because `radiation.ts` didn't exist yet. The SM replaced it with the shared function and updated its test.

## Sprint Review

**Increment:** `src/engine/science/` now holds UTCI, IREQ/DLE, clothing insulation, metabolic rates, radiation and the personal bias filter, and the forecast carries humidity, cloud and radiation. Nothing user-facing changes yet; S7 puts the model behind a flag in Sprint 5.

**Sprint Goal met.** Every module matches its reference fixtures within tolerance:

| Module | Fixture | Max error | Tolerance |
|---|---|---|---|
| `utci.ts` | 1,080 in-range rows | 0.005 °C | 0.05 °C |
| `ireq.ts` | cases, DLE sweep, extrapolated | 0.0005 clo, 0.005 h | 0.05 clo, 0.1 h |
| `clothing.ts` | garments, ensembles, 120-row correction grid | within | 0.001–0.05 clo |
| `radiation.ts` | every `mrt.json` row | within | per row |

Tests: 698 → 1,480. Typecheck, lint and build pass. `ireq` runs in about 0.003 ms a call; 384 hours of UTCI take about 0.5 ms.

**Carried to Sprint 5:** verify the six Open-Meteo variable names with a live request; add cycling ride speed to `ensembleClo` (S7); replay stored ratings into the bias filter (S7).

## Sprint Retrospective

**What went well**
- **Fixture-first science.** Every module was judged against independent reference values, and every Developer reported a number. No integration debate about whether a formula was right.
- **Five of five Done, one seam.** The only seam was a helper duplicated across two new files.
- **Developers caught the plan's mistakes.** Five errors in the spike and backlog were found and fixed by checking against sources, not by guessing.

**What didn't**
- **The plan was wrong in five places.** The bias formula contradicted its own acceptance test; a Compendium code, a walking rate, a walking-speed rule and a unit were wrong. The spike wrote formulas down without running them against their acceptance tests.
- **Graphify was stale.** The index was built at `e4ea976`, before the contracts, so Developers fell back to `rg`.
- **External checks came too late.** Open-Meteo's daily quota for this network was spent before anyone confirmed the new variable names live.
- **Tool connections dropped.** The GitHub connection failed after a session restart and came back only later.
- **Duplicated code, raised by the stakeholder.** `windAtBody` was written twice, once in `radiation.ts` (dev-05) and once privately in `clothing.ts` (dev-04), then reconciled at integration with a refactor and a test change. That is effort spent three times on one line. **Root cause was the SM's:** Planning landed the function's type but not its body, both stories needed it in the same wave, and dev-04's brief told them to write a local copy. The two copies also disagreed (0.68 against 0.6805). A one-line helper on `main` at Planning would have cost less than any of the three passes.

**Improvements committed for Sprint 5**
1. Re-index Graphify at `main` at every Sprint Planning, before Developers start.
2. A spike runs each formula against its acceptance tests before the formula goes into the backlog.
3. Confirm external API field names with one live request at Planning, before the build wave.
4. **Developers own the how, together.** The Scrum Guide makes Developers self-managing; the SM facilitates and does not decide code. Sprint 4 got this wrong: the SM's briefs dictated where helpers lived and told one Developer to copy one, and the five Developers never spoke to each other.
   - **Team board.** Each wave shares one board (`team/board.md`, outside the worktrees). Before coding, every Developer posts what they need from others and what they offer. Shared helpers are claimed there by one Developer; everyone else imports from the claimed path or codes against a test double until it lands.
   - **Ask, don't copy.** A Developer who needs something another owns asks on the board and carries on with other work; the owner answers and pushes it first.
   - **Peer review.** Each branch is reviewed by another Developer in the wave (rotation on the board) with `code-review`, before the SM integrates. Review checks for re-implemented code as well as bugs.
   - **SM role.** The SM writes the Sprint Goal and the outcome each item needs, keeps the board readable and removes blockers. Briefs say what and why, never which lines of code.
