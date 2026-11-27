# Continuous improvement log

Every Sprint Retrospective adds at least one improvement here. Each one is planned into the next Sprint and then judged at that Sprint's Retrospective: **kept** (it worked and is now the norm), **adjusted** (it helped but needed changing) or **dropped** (it didn't help).

| # | From | Improvement | Applied in | Outcome |
|---|---|---|---|---|
| 1 | Pre-Scrum | Never hide build output in scripts; read every check's result | Sprint 1 | **Kept.** The integration build caught the broken `app.css` brace |
| 2 | Pre-Scrum | One bounded request per external resource (archive API rate limit) | Sprint 1 | **Kept.** The MET Norway function caches one upstream call per location for 30 minutes |
| 3 | Pre-Scrum | Contracts first so Developers can work in parallel | Sprint 1 | **Kept.** 6 of 10 branches merged with no conflicts |
| 4 | Sprint 1 | Limit concurrency to five Developers per wave, with tighter briefs | Sprint 2 | Pending |
| 5 | Sprint 1 | Shared-contract rule: list and update every call site of a changed shared type in the same PR | Sprint 2 | Pending |
| 6 | Sprint 1 | One stylesheet per feature instead of appending to `app.css` | Sprint 2 | Pending |
| 7 | Sprint 1 | SM integrates in a dedicated worktree; Developer worktrees are removed on merge | Sprint 2 | Pending |
| 8 | Sprint 1 | Production smoke test of `/api/*` at each Sprint Review | Sprint 2 | Pending |

## Metrics we watch

| Sprint | Items selected | Items Done | PRs merged clean | Integration seams | Tests | Impediments |
|---|---|---|---|---|---|---|
| 1 | 10 | 10 | 6 | 4 (3 code, 1 CSS) | 111 → 360 | Usage limit stopped every Developer once |
