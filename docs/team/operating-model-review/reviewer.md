1. Already efficient: one lead and no dedicated PO/SM agents is sound; the lead already does both and the evidence shows no gap. Sizing developers to the change, instead of five per wave, targets the real cost. Peer review earns its keep, catching defects in S5, S6 and S7.

2. Expensive: Developer context. Five developers at 150-250k is 0.8-1.2M per Sprint. The Sprint 7 pitches cost 90-93k each, about 460k for nine one-line outputs, nearly all loading the same brief and docs. Fix-up resumes carry 150-250k of transcript for a few lines. The lead absorbs about 3k tokens of boilerplate per GitHub event, plus every report.

3. Unproven: that Graphify-first saves tokens. The index lagged main through Sprints 4-5 and developers fell back to text search; no saving has been measured. Skills-first is also unproven, as developers skipped skills and one lookup was refused by permissions. "Cheapest reliable model" has no data. Merging SM into the lead is assumed free, yet the S4 duplicate came from an SM brief, which cuts both ways.

4. Underused: cached shared prefixes, the lead for small changes, and peer review as the cheap quality gate.

5. Not considered: a trimmed, cached shared brief (6k and growing) with per-task slices. Pitch and research tasks on a cheap model with minimal context, or done by the lead. Fresh small agents for fix-ups instead of resuming big transcripts. Filtering GitHub events. Checkpointing and staggered waves, since all five hit the usage limit together. Protecting worktrees from resets. A duplicate-helper check before review.

6. Risk: a smaller team may remove independent review, where the defects were found, leaving the lead to review its own integration. A lead doing small changes alone bloats its own context. Seams are not falling (1,1,1,1,2), so fewer agents will not obviously help. Shared helpers need a named owner.

7. Change: keep the one lead, but require independent review for non-trivial changes. Adopt sizing as proposed. Make Graphify freshness a precondition and measure it against text search before relying on it. Cut brief and resume cost first. Treat savings as hypotheses against a measured per-Sprint token baseline.
