# Evidence pack: how we have actually worked (Sprints 4–7)

Facts only, from the Sprint docs, improvement log, interaction logs and agent usage reports.

## Cost per agent run (tokens reported at hand-back)
- Feature build runs: 128k–251k per Developer per Sprint item (Sprint 4: 139k–191k; Sprint 5: 130k–193k; Sprint 6: 128k–251k).
- Sprint 7 pitch-only runs (one line of output each): 90k–93k per Developer, about 460k for nine one-line pitches. Almost all of that is loading the brief, Sprint docs, requirements and skimming code before producing anything.
- Fix-up resumes (one small change) re-enter the agent's whole transcript: each resume carries the agent's full prior context (150k–250k), mostly cache, for a change of a few lines.
- Every Sprint: 5 Developers × ~150–250k ≈ 0.8–1.2M tokens of Developer context, plus the lead's.

## Reliability
- Usage limit stopped Developers mid-wave in Sprints 1, 5, 6 and 7 (four of seven Sprints; all five at once in Sprint 7).
- Two worktrees were lost after a reset in Sprint 7.

## Quality signals
- Integration seams per Sprint since Sprint 3: 1, 1, 1, 1, 2.
- Peer reviews found real defects every Sprint: S5 NaN coldest hour, missing tests, heat-rule edge; S6 undocumented privacy change, zero-exposure routine bug, copied UTCI helper (plus an older copy), running routine at full length; S7 °F bug, label stuck across zero.
- Duplicate implementations still appear: S4 windAtBody (SM brief caused it), S6 three UTCI copies, S7 two flag-helper copies (deleted before push).
- An innovation Sprint found a production gap (matched outfit 1.17 clo vs 1.38 target) that feature Sprints missed.

## Process overhead observed by the lead
- The lead's context carries every GitHub notification (each subscription event repeats ~3k tokens of boilerplate), every Developer report, and re-reads of shared files.
- PR descriptions needed manual clean-up after creation every time (tool appends a footer).
- Developers skipped required skills (web guidance, accessibility audit, ux-writing) in S6 and S7, partly by choice, partly because the permission system refused a lookup.
- Graphify: index lagged main for most of Sprint 4–5, then followed main; Developers often fell back to text search for new code.
- Briefs: one shared brief (~6k tokens, growing each retro) plus Sprint doc plus science docs loaded by every Developer.

## Team structure today
- Lead (this session) plays PO and SM; Developers are background agents with isolated worktrees; 5 per wave; one Sprint PR merged with a merge commit; interaction logs per agent.
- Reviewer (fresh, cheaper model) used 76k tokens to read two small files and write 350 words: fixed per-agent start-up cost is ~70k before any task context.
- dev-07 resumed for a 350-word assessment: 177k tokens (its prior transcript), versus 76k for a fresh reviewer reading the same two files.
