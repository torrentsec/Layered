# Sprint 7 (innovation Sprint)

**Sprint Goal:** learn which new ideas make Layered's advice more trusted.

The first innovation Sprint (see [process](../process.md#innovation-sprints)). Every Scrum event still happens; Done means a prototype behind a flag, a write-up in `docs/innovation/` and a demo. Production behaviour doesn't change.

## Sprint Planning

### Pitches (Team Square ■)

Nine distinct ideas were pitched on the team board. Two Developers found they had pitched the same idea as dev-07 and withdrew theirs, backed it and offered to pair.

| Pitch | From | Size | PO decision |
|---|---|---|---|
| Calibrate the feels-like wording: UTCI with its stress category beside standard wind chill, proof the advice doesn't move | dev-07, refined by dev-06 | S | **Picked** (#84) |
| Feels-like in what you wear: "Warm enough in your coat for 40 min; add gloves after that" | dev-06 | M | **Picked** (#85) |
| Site exposure per place: open, city street, mostly shade | dev-08 | S | **Picked** (#86) |
| "What Layered has learned about you" card with certainty and reset | dev-09 | S | **Picked** (#87) |
| "What would change this?" per layer in Why this? | dev-10 | S | **Picked** (#88) |
| Re-score votes against observed weather (tech debt D8) | dev-07, +1 dev-09 | M | Backlog |
| Check the fallback's cloud-based sun estimate against forecast radiation | dev-08 | S | Backlog |
| Household bias with shared strength (E12) | dev-09 | M | Backlog |
| "Changed since this morning" (US-043) | dev-10 | M | Backlog |

**Why these five:** each tests one way to make the advice easier to trust: an honest number people can compare (#84), a statement about clothing instead of a number (#85), fewer wrong assumptions about the place (#86), showing what the app has learned (#87) and showing how close the advice is to changing (#88). The deferred four are worth doing but answer different questions or are larger.

Peer review rotation: dev-06 → dev-07 → dev-08 → dev-09 → dev-10 → dev-06.

### Applying last Sprint's improvements

| # | Improvement | How it shows up |
|---|---|---|
| 23 | Run e2e before Ready for review when a change touches a screen | In the brief |
| 24 | Claim new exported helpers on the board before writing them | In the brief |
| 25 | Each agent writes only its own log lines | In the brief |

## Daily Scrum

Pitch phase, then one build wave. All five Developers were stopped once by the usage limit and resumed after the reset. The board and the interaction logs carry the detail.

| Developer | Item | Collaboration |
|---|---|---|
| dev-06 | #85 feels-like in what you wear | Wrote the one shared flag helper (`flagOn`) that all five spikes use, agreed on the board; reviewed dev-07 |
| dev-07 | #84 feels-like calibration | Took dev-06's refinements from the pitch; built on the shared flags; reviewed dev-08 and posted the merged line for the hourly strip ahead of integration |
| dev-08 | #86 site exposure | Moved the golden-day data into a shared fixture so evidence tests stop copying it; reviewed dev-09 and confirmed a label bug by running it |
| dev-09 | #87 learned card | Dropped its own flag helper for dev-06's; built inside the Sprint 3 "learned" section; reviewed dev-10 and found the °F bug |
| dev-10 | #88 what would change | Deleted its own flag helper before pushing and used dev-06's; fixed the °F bug |

**Integration:** every spike added its name to the same `FLAGS` line, and three touched the hourly strip in `DayView`; resolved by keeping all sides. Fix-up wave: dev-09 (label stuck across zero), dev-10 (margin in the user's units). Combined: 1,793 unit tests, e2e 6/6, axe with no serious or critical violations, typecheck, lint and build pass. Production behaviour is unchanged: every prototype is behind a `?flags=` value.

## Sprint Review

**Sprint Goal met:** each idea answered its question with evidence. Keep or drop (PO):

| Idea | Evidence | Decision |
|---|---|---|
| #84 feels-like calibration | UTCI reads 7–12° below wind chill in wind and 9–13° above other apps' feels-like in sun; no fixed offset closes a gap that goes both ways. The familiar number contradicts our own Why this? | **Keep "real temperature first"** (US-081). **Drop** the familiar wind-chill number |
| #85 feels-like in what you wear | The line always agrees with the target, but it exposed a real gap: on the London golden day the matched outfit reaches 1.17 clo against a 1.38 target | **Keep, after matching works in clo** (US-086 after US-080). US-080 goes to the top of the backlog |
| #86 site exposure | A city street changes 3 of 7 golden-day outfits, mostly through wind shelter, but the shelter factor is a guess (11–16 flips across its plausible range) | **Keep "mostly in shade"** (US-082). **Hold "city street"** until votes record what was worn (US-085) |
| #87 learned card | Right words for 98 of 100 simulated people; hysteresis cut word changes from 2.8 to 0.7 in 60 days; "fairly sure" after about 5 votes | **Keep** after four fixes: Reset scope, incremental maths, the leftover °C row, final wording (US-083) |
| #88 what would change this | 1 of 6 golden days and about a quarter of conditions are within a degree of changing; most are mild days | **Keep**, shown only when 2° or less would change the advice (US-084) |

**Not done:** the blind read of the wordings with real people. The flags are in production builds so it can be done on a phone at any time.

**Biggest finding of the Sprint:** not one of the five ideas, but the gap #85 exposed. The science engine sets the right target and the matcher can fall short of it. US-080 (match in clo) is now the PO's top item.

## Sprint Retrospective

**What went well**
- **Pitching worked.** Nine distinct ideas; two Developers withdrew duplicates and backed a teammate's pitch instead.
- **One shared helper, agreed first.** dev-06 claimed the flag helper on the board; two others noticed their own copies and deleted them before pushing. Improvement 24 worked, if late.
- **Evidence over opinion.** Every write-up has numbers, and two recommended against parts of their own idea.
- **An innovation Sprint found a production problem.** The clo gap would not have surfaced in a feature Sprint.

**What didn't**
- **Required skills skipped.** Three Developers skipped the web-guidance, accessibility or ux-writing skills, partly by choice and partly because the permission system refused web-guidance. Checks were done by hand.
- **Shared lines are merge hot-spots.** Five spikes edited one `FLAGS` line and three edited one strip line in `DayView`.
- **The usage limit** stopped the whole team once more.
- **Two Developers lost their worktrees** after the reset and had to recreate them.

**Is the cadence right?** Yes, keep one innovation Sprint in four. This one paid for itself with US-080 alone.

**Improvements for the next Sprint**
1. **Registries take one line per entry** (for example the `FLAGS` list), so parallel additions don't conflict.
2. **Skills by default, not by choice:** if a required skill is unavailable, the Developer says so on the board at the start, and the SM raises it as an impediment instead of finding out at hand-back.
3. **Plan around the usage limit:** keep waves to what fits in one usage window, and post Stable commits often so a stop loses nothing.

## Pause

The stakeholder asked to stop after this Sprint. The Product Backlog is ordered for whoever picks it up next: US-080 first, then US-081, US-083, US-084 and US-085.
