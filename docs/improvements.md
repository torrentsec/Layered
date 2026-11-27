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
| 10 | Sprint 2 | Each feature imports its own stylesheet from its component | Sprint 3 | Pending |
| 11 | Sprint 2 | One owner per hot-spot file (`Today`, `DayView`, `SharePoster`) per Sprint | Sprint 3 | Pending |
| 12 | Sprint 2 | Never create links inside a tracked tree; each worktree installs its own dependencies | Sprint 3 | Pending (already in the brief) |

## Metrics we watch

| Sprint | Items selected | Items Done | PRs merged clean | Integration seams | Tests | Impediments |
|---|---|---|---|---|---|---|
| 1 | 10 | 10 | 6 | 4 (3 code, 1 CSS) | 111 → 360 | Usage limit stopped every Developer once |
| 2 | 5 | 5 | 2 | 7 (`main.tsx` ×3, Week, DayView, Settings, SharePoster) | 361 → 630 | SM-caused `node_modules` link (#40) |
