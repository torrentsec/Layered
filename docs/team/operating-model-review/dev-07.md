# dev-07 (Team Square): operating-model assessment

Sprint 5 #69 isn't in my current context, so this draws on the Sprint 7 pitch, #84 and my review of #86.

## 1. Efficient
- Board Claims plus Stable hashes caught three flag helpers before any was pushed. I switched to dev-06's helper with one merge.
- Peer review is cheap and finds real defects. Reviewing #86 found that it and my #84 rewrite the same DayView line.

## 2. Expensive
- My pitch cost about 90k tokens for two lines.
- Resuming an agent for a new phase drags its whole transcript along.
- The brief is long, grows every retro, and every agent reads all of it.

## 3. Wrong assumptions
- "Every Developer has a worktree": mine disappeared mid-Sprint.
- "Graphify follows main": it was a commit behind, and a caller lookup came back unresolved.
- "Every UI change runs every skill": the skills I skipped wouldn't have changed a 9-line CSS file.

## 4. Underused
- Graphify `remember`/`recall` for shared findings.
- Shared fixtures: dev-08 made a golden-days fixture while I copied the same data.

## 5. Things the lead may not know
- `shot.mjs` builds base + "/" + hash, so `?flags=x` silently didn't apply. My first screenshots were wrong but looked fine.
- e2e failed once, then passed twice. Rerun before calling it red, and note when it's flaky.
- A parallel `git fetch` hits ref-lock errors in shared clones. Fetch into FETCH_HEAD.

## 6. Where the proposal could hurt
- "Small feature = lead only" means nobody reviews the lead's own code. Peer review caught a defect every Sprint.
- The cheapest model on science code risks wrong formulas. Wind chill needed a check against a published chart.

## 7. What I'd change
- A 1-page core brief, plus sections loaded by task type.
- Pitches from a 2k-token context pack.
- A fresh agent with a spec for each phase.
- Keep peer review, sized to risk.
- Fix `shot.mjs`.
- A skills checklist that says when each one applies.
