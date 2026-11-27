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

The Developers coordinated on the team board: 53 entries, 15 questions and answers between Developers, 6 peer reviews. The SM read the board at each hand-back and removed impediments.

| Developer | Item | Collaboration on the board |
|---|---|---|
| dev-09 | #70 bias from votes | Agreed with dev-07 to hand the bias over as a plain number; took dev-08's review finding and shared `sensitivityOffset` instead of repeating it; reviewed dev-10 and dropped two findings after checking them against `main` |
| dev-08 | #68 Hour → Weather, cycling | Proposed `airSpeedAtBody` so the wind-plus-ride sum exists once; told dev-07 the new `ensembleClo` shape; reviewed dev-09 |
| dev-10 | #71 "Why this?" | Proposed the `ScienceWhy` shape to dev-07 before either wrote code; reviewed dev-06 and found missing tests, an inline copy of the air-speed sum and a heat-rule edge |
| dev-07 | #69 science behind the flag | Coded against claimed interfaces with test doubles; posted three failing golden days to dev-06 instead of patching their code; reviewed dev-08 |
| dev-06 | #67 clothing target | Retuned the target after dev-07's golden-day failures; fixed dev-10's findings; reviewed dev-07 and found a NaN coldest-hour bug |

**Impediments:**
- **Usage limit.** Four Developers stopped mid-wave and resumed after the reset; nothing was lost.
- **Rebased branches couldn't be pushed.** "Rebase before reporting" rewrites a branch that is already on GitHub, and force-pushes are refused, so dev-08's and dev-09's rebased branches stayed local. The SM integrated from the local refs.
- **Stakeholder request mid-Sprint:** neutral location and credit (#74). Developers were told on the board; the SM fixed the remaining headers at integration.

**Integration:** one seam. dev-07 had merged earlier copies of dev-06's and dev-08's files; the owners' current versions were kept. Fix-up wave: dev-06 switched to `airSpeedAtBody`, dev-07 fixed the NaN coldest hour. Combined: 1,585 tests, e2e, typecheck, lint and build pass.

## Sprint Review

**Sprint Goal met.** Behind `settings.engine: 'science'`, advice comes from the thermal model and every golden day gives the PO's expected verdict. The band engine is unchanged, and a test proves it.

| Day | Expected | Band engine | Science engine |
|---|---|---|---|
| London, 26 Nov | `coat` | `bundle` | `coat` (1.38 clo), waterproof outer |
| Mild and sunny | `two` | `two` | `two` (0.70–0.82 clo, near an edge) |
| Madrid, summer | `tshirt` | `tshirt` | `tshirt`, sunscreen |
| Oslo, January | `bundle` | `bundle` | `bundle` (1.65 clo), hat and gloves |
| Sun against cloud | Clear day lighter | `coat` vs `bundle` | `two` vs `coat` |
| Cycling | Same or warmer, windproof | `bundle` | `coat`, windproof outer |

The science engine beats the band engine where it matters: it no longer overdresses a cold, wet London day, and it gives the sun credit. "Why this?" explains the advice in plain words with clo and UTCI as detail, and feels-like sits beside the real temperature.

**Tests:** 1,480 → 1,585.

**Product Backlog changes (PO):**
- **Sprint 6: switch-over.** Make the science engine the default; remove the band engine's insulation rules (tech debt D2).
- **New items found this Sprint:** a settings control for the engine; routine legs should use the routine's own length as exposure; commute and routine feels-like ranges merged across legs; the hero number and hourly strip should show UTCI under the science engine; the mild golden day sits on a band edge (watch after switch-over).
- **Tech debt:** D3 (Graphify index) is paid off: the index now follows `main`.

## Sprint Retrospective

**What went well**
- **The Developers ran the how.** Interfaces were agreed on the board before code, shared helpers were claimed once, failures went to the owner instead of being patched, and every branch had a peer review. The SM wrote no feature code.
- **No duplicate implementations.** Reviews caught the one inline copy (the air-speed sum) and its owner removed it.
- **Peer reviews found real bugs.** A NaN coldest hour, missing tests, a heat-rule edge. Reviewers also checked their own findings and dropped two that were wrong.
- **Golden days written first.** The PO's expected verdicts drove the target's tuning instead of being fitted afterwards.

**What didn't**
- **Rebase versus no force-push.** The brief's "rebase before reporting" can't work once a branch is on GitHub. Two Developers ended with local-only branches.
- **Early merges of moving branches.** dev-07 merged copies of dependencies before their owners finished, which caused the one integration seam.
- **Usage limit mid-wave** again stopped four Developers.
- **Old headers in new files.** The credit change landed mid-Sprint and only one Developer updated their files.
- **The SM tried to archive the raw board in the repo.** It holds workspace paths, so it was blocked; the Daily Scrum above summarises it instead.

**Improvements committed for Sprint 6**
1. **Merge, don't rebase, once pushed.** Developers merge `origin/main` into a branch that is already on GitHub; rebase only before the first push.
2. **Depend on pushed commits, named on the board.** A Developer who needs another's work merges the commit hash the owner posts as stable, and re-merges when the owner posts a newer one.
3. **Per-story history.** The Sprint PR is merged with a merge commit so each story's commits stay visible on `main` (tech debt D5).
