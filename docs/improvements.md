# Continuous improvement log

Every Sprint Retrospective adds at least one improvement here. Each one is planned into the next Sprint and then judged at that Sprint's Retrospective: **kept** (it worked and is now the norm), **adjusted** (it helped but needed changing) or **dropped** (it didn't help).

| # | From | Improvement | Applied in | Outcome |
|---|---|---|---|---|
| 1 | Pre-Scrum | Never hide build output in scripts; read every check's result | Sprint 1 | **Kept.** The integration build caught the broken `app.css` brace |
| 2 | Pre-Scrum | One bounded request per external resource (archive API rate limit) | Sprint 1 | **Kept.** The MET Norway function caches one upstream call per location for 30 minutes |
| 3 | Pre-Scrum | Contracts first so Developers can work in parallel | Sprint 1 | **Kept.** 6 of 10 branches merged with no conflicts |
| 4 | Sprint 1 | Limit concurrency to five Developers per wave, with tighter briefs | Sprint 2 | **Kept.** No usage-limit stops; 5 of 5 Done |
| 5 | Sprint 1 | Shared-contract rule: list and update every call site of a changed shared type in the same PR | Sprint 2 | **Kept.** Every PR listed its call sites; no broken call sites at integration |
| 6 | Sprint 1 | One stylesheet per feature instead of appending to `app.css` | Sprint 2 | **Adjusted.** No `app.css` conflicts, but the collision moved to the import lines in `main.tsx` (see #10) |
| 7 | Sprint 1 | SM integrates in a dedicated worktree; Developer worktrees are removed on merge | Sprint 2 | **Adjusted.** Stacked integration caught every seam, but a convenience symlink in that worktree was committed (#40). See #12 |
| 8 | Sprint 1 | Production smoke test of `/api/*` at each Sprint Review | Sprint 1 Review | **Kept.** Found #33 (forecast fallback broken in production) on its first run |
| 9 | Sprint 2 (stakeholder) | Use the relevant skills and Graphify on every item | Sprint 2 (mid-Sprint) | **Kept.** Adopted by 2 Developers and the SM's review. In the brief from Sprint 3 |
| 10 | Sprint 2 | Each feature imports its own stylesheet from its component | Sprint 3 | **Kept.** No style-import conflicts in Sprint 3 (#55) |
| 11 | Sprint 2 | One owner per hot-spot file (`Today`, `DayView`, `SharePoster`) per Sprint | Sprint 3 | **Kept.** Others recorded history from `src/state/` and put feedback UI in `TodayExtras`; zero hot-spot conflicts |
| 12 | Sprint 2 | Never create links inside a tracked tree; each worktree installs its own dependencies | Sprint 3 | **Kept.** No links committed. Extended by #13 |
| 13 | Sprint 3 | Reinstall dependencies in the integration worktree whenever the lockfile changes on `main` | Sprint 4 | **Kept.** One `npm ci` before checks; no false type errors |
| 14 | Sprint 3 | Developers stop the servers they start; the SM clears leftover previews before integrating | Sprint 4 | **Kept.** No port conflicts |
| 15 | Sprint 3 | State lives in git: decisions land in the Sprint doc or this log as they're made | Sprint 4 | **Adjusted.** PO decisions were captured at each hand-back but landed in git at Review, not as made. Keep, and commit them with the integration branch as it grows |
| 16 | Sprint 4 | Re-index Graphify at `main` at every Sprint Planning | Sprint 5 | **Kept.** Blocked at Planning, then the index followed `main` again mid-Sprint (D3 paid off) |
| 17 | Sprint 4 | A spike runs each formula against its acceptance tests before writing it into the backlog | Sprint 5 | **Kept.** Golden days were written as runnable expectations before implementation and drove the tuning |
| 18 | Sprint 4 | Confirm external API field names with one live request at Planning | Sprint 5 | **Kept.** Confirmed at Planning from the provider's documentation source |
| 19 | Sprint 4 (stakeholder) | Developers self-manage the how: a shared team board for needs, offers and claimed helpers; ask instead of copy; peer review by another Developer. The SM facilitates and never dictates code | Sprint 5 | **Kept.** 53 board entries, 15 questions and answers, 6 peer reviews, no duplicate code merged, SM wrote no feature code |
| 20 | Sprint 5 | Merge `origin/main` into a pushed branch; rebase only before the first push | Sprint 6 | **Kept.** No stuck or force-pushed branches |
| 21 | Sprint 5 | Depend on commits the owner posts as stable on the board, and re-merge on a newer one | Sprint 6 | **Kept.** Developers merged posted Stable hashes; one integration seam |
| 22 | Sprint 5 | Merge the Sprint PR with a merge commit so each story's commits stay visible | Sprint 6 | **Kept.** Sprint 5 merged with a merge commit (#76) |
| 23 | Sprint 6 | Run e2e before Ready for review when a change touches a screen | Sprint 7 | **Kept.** Every spike reported e2e 6/6 before Ready for review; integration e2e passed first time |
| 24 | Sprint 6 | Post any new exported helper as a Claim before writing it | Sprint 7 | **Adjusted.** One shared flag helper was claimed; two copies were still written and deleted before pushing. Claim first, then write |
| 25 | Sprint 6 | Each agent writes only its own interaction log lines | Sprint 7 | **Kept.** No lines written on another's behalf |
| 26 | Sprint 7 | Registries take one line per entry so parallel additions don't conflict | Next Sprint | Pending |
| 27 | Sprint 7 | A Developer who can't use a required skill says so at the start; the SM treats it as an impediment | Next Sprint | Pending |
| 28 | Sprint 7 | Size waves to one usage window and post Stable commits often | Next Sprint | Pending |
| 29 | Operating-model review | Adopt the ratified [operating model](operating-model.md): one lead, 2–3 Developers by default, independent review on every change, one-page task specs with an obligations checklist, model routing, measured tokens per story | Next Sprint | Pending |

## Metrics we watch

| Sprint | Items selected | Items Done | PRs merged clean | Integration seams | Tests | Impediments |
|---|---|---|---|---|---|---|
| 1 | 10 | 10 | 6 | 4 (3 code, 1 CSS) | 111 → 360 | Usage limit stopped every Developer once |
| 2 | 5 | 5 | 2 | 7 (`main.tsx` ×3, Week, DayView, Settings, SharePoster) | 361 → 630 | SM-caused `node_modules` link (#40) |
| 3 | 5 | 5 | 4 | 1 (Settings) | 630 → 698 + 5 e2e + axe + Lighthouse | Session restart; stale dependencies; a port held by a leftover server |
| 4 | 5 | 5 | 1 (one Sprint PR) | 1 (`windAtBody` duplicate) | 698 → 1,480 | Open-Meteo quota spent; GitHub connection dropped after restart |
| 5 | 5 | 5 | 1 Sprint PR + 3 side PRs (#73–#75) | 1 (early merge of moving branches) | 1,480 → 1,585 | Usage limit mid-wave; force-push refused for rebased branches |

| 6 | 5 | 5 | 1 Sprint PR | 1 (import order) | 1,585 → 1,688 + 6 e2e | Usage limit mid-wave; a permission check blocked one guidance lookup |
| 7 (innovation) | 5 | 5 prototypes | 1 Sprint PR | 2 (`FLAGS` line, hourly strip) | 1,688 → 1,793 + 6 e2e | Usage limit stopped all five; two worktrees lost |
| 8 | 3 | 3 | 1 Sprint PR | 1 (`FLAGS`) | 1,793 → 1,803 + 7 e2e | Usage limit stopped all three; privacy escalation unanswered |
