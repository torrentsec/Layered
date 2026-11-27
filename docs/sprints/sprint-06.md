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

The Developers coordinated on the team board and, for the first time, in the interaction logs: 84 board entries, 25 questions and answers between Developers, 12 peer reviews, 296 logged lines across all agents (see `docs/team/logs/`).

| Developer | Item | Collaboration |
|---|---|---|
| dev-05 | #81 saved forecasts | Checked with dev-04 that the Worker never reads the cache; reviewed dev-01 and found that a routine under way was judged at full length; fixed dev-04's short-column finding |
| dev-01 | #77 routine exposure | Took dev-05's finding (time left for a routine under way); built on dev-04's posted planner instead of copying it; added dev-03's request for UTCI in routine cold notes; reviewed dev-02 |
| dev-02 | #78 science by default | Made `engineOf` the only reader of the setting, so other Developers' screens followed the default without changes; reviewed dev-03 and found a copied UTCI helper |
| dev-03 | #79 UTCI on hero and strip | Replaced the copied helper with one shared `weatherUtci` (removing an older copy too); used dev-04's `placeOf`; reviewed dev-04 and found an undocumented privacy change and a zero-exposure bug in dev-01's code |
| dev-04 | #80 one engine everywhere | Moved the day planner into one pure function shared by the app and the push Worker; agreed the merge rule for `advice.ts` with dev-02; documented what notifications send, in the README, architecture notes and on screen |

**Impediments:**
- **Usage limit** stopped four Developers mid-wave; all resumed after the reset with nothing lost.
- **A permission check** blocked one Developer's web-guidance lookup; the accessibility audit was still done.

**Integration:** one import-order seam in `src/state/advice.ts`. Merge order 80 → 78 → 77 → 81 → 79 avoided the rest. Fix-up wave: dev-01 (finished routine gave zero exposure), dev-04 (privacy wording on the Notifications screen, Trip refresh), dev-05 (short saved columns), dev-03 (smoke test expected the band engine's hero text). Combined: 1,688 tests, e2e 6/6, axe with no serious or critical violations, typecheck, lint and build pass.

## Sprint Review

**Sprint Goal met.** Everyone without a setting now gets the thermal model; Settings offers simple bands for one more Sprint. Today, DayView, Week, Trip, the share poster, history and notifications all use one planner, and a test runs the app and the push Worker side by side and finds the same band, clo, extras and text.

| Acceptance (PO) | Result |
|---|---|
| Default users get science; six golden days pass through the default path | Met |
| Choosing simple bands gives exactly the Sprint 5 answers | Met (full outfits recorded per golden day) |
| A notification and Today agree for the same place and hour | Met for band, clo and text; extras can differ (see below) |
| Twenty places stay well inside storage; old saved forecasts load | Met: 89.6 kB → 25.5 kB per place, 20 places under a fifth of the limit |

**Tests:** 1,585 → 1,688 unit, e2e 5 → 6.

**PO review of the numbers.** The hero now shows UTCI. In the test forecast, 08:00 reads "Feels like −9°" with an actual 5°. Checked against the UTCI polynomial: 5 °C in a 25 km/h wind is about −11 °C UTCI with no sun, so the number is right. It is much harsher than the wind-chill "feels like" other apps show, and people will compare. Accepted for now; calibrating the wording is a Sprint 7 innovation item.

**Privacy.** Notifications now send a little more so they stay personal: the clo bias and vote count, a summary of learned votes, time outside, the engine choice and routines without names. The README, the architecture notes and the Notifications screen say so in plain words, and turning notifications off deletes it all. Votes, their dates, routine names and the wardrobe never leave the device.

**Product Backlog changes (PO):**
- **Sprint 7 (innovation):** calibrate the feels-like wording against other apps; the seed ideas in `docs/innovation/`.
- **New items:** notifications can name an extra the wardrobe rules out (the Worker has no wardrobe); the Heat heads-up should use UTCI heat stress; commute legs still count forecast hours as time outside; typical trip days take the sun from longitude only.
- **Tech debt:** D6 and D7 paid off. D2 (remove the band engine) is next once simple bands have had their Sprint.

## Sprint Retrospective

**What went well**
- **Collaboration was visible.** The interaction logs show who asked whom for what, and 12 peer reviews found real problems: a privacy change missing from the docs, a zero-exposure bug, a copied helper, a running routine judged at full length.
- **Depending on posted commits worked.** Developers merged each other's Stable hashes instead of guessing, and integration had one seam.
- **No force-pushes, no stuck branches.** Merging `main` into pushed branches (improvement 20) removed last Sprint's problem.

**What didn't**
- **A copied helper still got written.** A third UTCI-from-weather copy appeared, and an older one from Sprint 5 was still there. Review caught both, but the rule didn't stop them being written.
- **Browser tests ran late.** No Developer ran e2e on the combined Stable commits, so the hero text change broke the smoke test only at integration.
- **Usage limit** again stopped four Developers mid-wave.
- **The SM logged a hand-back on a Developer's behalf** by mistake and had to remove it: logs must be written by the agent that acted.

**Improvements committed for Sprint 7**
1. **Run e2e before Ready for review** whenever a change touches a screen, on top of the Stable commits it depends on.
2. **Search before writing a helper, and name it on the board.** A Developer posts any new exported helper as a Claim before writing it, so a duplicate is caught before it exists rather than at review.
3. **Each agent writes only its own log lines.** The helper already writes to both sides; nobody adds lines for someone else.
