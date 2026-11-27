# Operating model

How the Layered team works, ratified after a review of the stakeholder's proposal (November 2026). It replaces the team-size and coordination parts of [process](process.md); the Scrum events, Definition of Done and engineering practices there still apply.

**Objectives, in order:** engineering quality; tokens per merged story (all agents together); elapsed time; autonomy; continuous improvement. Correctness and meaningful validation are never traded for tokens.

## How the review ran

| Voice | How it took part | Cost |
|---|---|---|
| Product Owner, Scrum Master | Written by the lead before reading anyone else's | in lead context |
| Team Square | dev-07, resumed with its own history | 177k tokens |
| Team Circle | A fresh agent reading dev-01 to dev-05's interaction logs (the original sessions could not be resumed) | 87k tokens |
| Independent reviewer | A fresh agent on a cheaper model, reading only the proposal and an evidence pack | 76k tokens |

The cost column is itself evidence: resuming an experienced agent cost twice a fresh one, and its compacted history no longer held its oldest Sprint.

## What we found (the evidence)

- **Most cost is reading, not writing.** A Developer run costs 128k–251k tokens. A pitch run that produced one line cost 90k. A fresh agent that read two short files cost 76k: about 70k is fixed start-up before any task context.
- **Resumes are expensive.** A fix-up resume carries the agent's whole transcript (150–250k) for a few lines, and fails once its worktree is gone.
- **Peer review is the quality engine.** It found real defects every Sprint (NaN coldest hour, privacy gap, zero-exposure routine, three copied helpers, °F bug, stuck label). The lead's own reviews missed some of them.
- **Fan-out was set by capacity, not need.** Five Developers every Sprint; Team Circle judges three would have covered Sprint 6.
- **The usage window, not parallelism, limits speed.** Waves stopped in four of seven Sprints; more parallel agents hit the limit sooner.
- **Developers coordinate well without the lead.** Interfaces, claims and Stable commits were agreed on the board faster than a lead could relay them.

## The model

### Roles
- **One lead** holds Product Owner, Scrum Master, architect, delivery and integration. No standing PO or SM agents. *(Proven: the lead already did this; no gap observed.)*
- **The stakeholder is the real Product Owner** for privacy and user-visible meaning: the lead escalates those trade-offs instead of deciding alone. *(Changed from the proposal: Sprint 6's push data and Sprint 6's feels-like headline were decided by the lead alone.)*
- **Developers own the how.** They agree interfaces and claim shared helpers on the board; the lead sets outcomes and acceptance and arbitrates only when they disagree. *(Changed from the proposal, which gave interfaces to the lead.)*

### Team size
| Work | Team |
|---|---|
| Docs, config, one-file fix with a clear cause | Lead implements; an **independent reviewer** checks the diff |
| Small feature | Lead + 1 Developer, peer-reviewed by a fresh reviewer |
| Medium feature or a Sprint of related items | Lead + 2–3 Developers, rotating peer review |
| Several genuinely independent workstreams | Lead + up to 5, only if each has its own files |

Default is 2–3. Never spawn because capacity exists. *(Changed: the proposal had no review on lead-only changes; every voice objected.)*

### Context
- **Task spec, not brief.** One page per task: objective, acceptance, relevant Graphify findings, files, dependencies, ownership, and an **obligations checklist** (tests, e2e if a screen changes, docs, privacy wording, copy, accessibility). Trim context, never obligations. *(Changed: trimming context is how dev-04 missed the privacy duty.)*
- **One short, stable rules file** (hard rules, git, logging) replaces the growing brief. It stays unchanged within a Sprint so it caches.
- **Pitches and research** get a 2k-token context pack, not the full docs.
- **Fix-ups go to a fresh small agent** with the diff, the finding and the owner's files, not a resume. *(Hypothesis: a fresh assessment cost 76k against 177k resumed, but that measured assessments, not fix-ups.)*
- **Reviewers post findings straight to the owner**, never through a third Developer.
- **Reports** are at most 150 words: what changed, files, tests and results, Stable hash, blockers.

### Codebase understanding
- **Graphify for `main`, `rg` for branches.** Before claiming any new helper, run `graphify_find` for an existing one (Team Circle: a duplicate UTCI helper would have been caught). Graphify can't see teammates' Stable commits, so use `rg` on fetched branches for in-flight code. Before changing a default or a shared signature, run `graphify_tests_for` or `graphify_impact` to list the tests it will break. *(Hypothesis: measure duplicates and surprise test failures per Sprint.)*
- **Share findings once.** Graphify `remember` for architecture findings worth reusing across agents. *(Experiment.)*

### Skills
- A one-line table says when each skill applies (web guidance for new UI patterns, accessibility audit for new screens or controls, ux-writing for new copy, workers practices for the Worker, code-review on every diff). A Developer who can't load a required skill says so at the start as an impediment. *(Changed: "every skill on every UI change" was waste on 9-line CSS edits; skipping silently was the opposite failure.)*

### Models and effort
- **Strongest model** for the engine, science maths, privacy and security, integration.
- **Cheaper model** for pitches, research summaries, docs, independent diff reviews and fix-ups with a clear cause. *(Experiment, with a decision rule: for two Sprints, run cheaper-model reviews alongside the usual peer review on the same diffs. Keep the cheaper reviewer if it finds at least as many confirmed defects per review; otherwise drop it.)*

### Testing
- Targeted tests while working. Full unit suite, plus e2e if a screen changed, before posting a **Stable** others will merge. Whoever changes a default owns the fixtures it breaks. Rerun a failing e2e once before calling it red, and record the flake. Full suite, e2e and axe once at integration.

### Integration and lead overhead
- One Sprint PR with a merge commit; Developers merge each other's Stable commits so most integration happens before the lead.
- The lead subscribes to the Sprint PR only, and merges promptly, to keep notification noise out of its context.
- Keep worktrees until the Sprint PR merges, so agents can still be reached; delete them after. Push before any long wait. If a worktree is lost anyway, recreate it from the pushed branch and continue.
- Fetch other Developers' work into `FETCH_HEAD` rather than updating shared refs, to avoid ref-lock errors in shared clones.
- Screenshots behind a flag must show the flag on: the screenshot script keeps a `?flags=` query before the hash (fixed after Sprint 7).

### Measuring
**Baseline (recorded at ratification).** Developer tokens per merged story, from hand-back usage: Sprint 6 about 183k (917k across 5 stories); Sprint 7 about 189k per prototype, or about 281k including the 460k pitch round. The lead's own usage isn't reported per Sprint, so it isn't in the baseline. Every saving is judged against these figures.

Per Sprint, in the improvement log: tokens per merged story (sum of hand-back usage ÷ stories), defects found in review, duplicates found, seams, usage-limit stops. Retros stay short: only actionable changes.

### Pacing
Size each wave to fit one usage window; post Stable commits often so a stop loses nothing; stagger large waves instead of starting five at once.

## Ratification

| Voice | Verdict | Modifications required (all accepted) |
|---|---|---|
| Team Square (dev-07) | Agree with modifications | Fix the screenshot script's flag handling; a recovery step for a lost worktree |
| Team Circle | Agree with modifications | Reviewers post to the owner directly; tests-for or impact before changing a default; fresh fix-ups recorded as a hypothesis, not proven |
| Independent reviewer | Agree with modifications | Record the token baseline now; a decision rule for the cheaper-reviewer experiment |
| Product Owner, Scrum Master | Agree | — |

Points dropped and accepted as dropped by their authors: shared test fixtures by default (covered by the duplicate check), filtering GitHub events beyond subscribing to one PR.

## Proven, hypothesis, experiment

| Change | Status |
|---|---|
| One lead, no standing PO/SM | Proven |
| Peer or independent review on every change | Proven |
| Fresh agent for fix-ups | Hypothesis |
| Developers agree interfaces on the board | Proven |
| Team of 2–3 by default | Hypothesis (Team Circle's estimate for Sprint 6) |
| Obligations checklist in every spec | Hypothesis |
| Graphify duplicate check before claims; tests-for or impact before default changes | Hypothesis |
| Reviewers post findings straight to the owner | Adopted (no cost) |
| Cheaper model for reviews, pitches, docs | Experiment |
| Graphify `remember` for shared findings | Experiment |
| Staggered waves within one usage window | Experiment |
