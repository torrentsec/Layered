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
| 16 | Sprint 4 | Re-index Graphify at `main` at every Sprint Planning | Sprint 5 | Pending |
| 17 | Sprint 4 | A spike runs each formula against its acceptance tests before writing it into the backlog | Sprint 5 | Pending |
| 18 | Sprint 4 | Confirm external API field names with one live request at Planning | Sprint 5 | Pending |
| 19 | Sprint 4 (stakeholder) | No duplicate implementations: shared helpers land on `main` at Planning, larger ones get one owner; briefs never ask for local copies | Sprint 5 | Pending |

## Metrics we watch

| Sprint | Items selected | Items Done | PRs merged clean | Integration seams | Tests | Impediments |
|---|---|---|---|---|---|---|
| 1 | 10 | 10 | 6 | 4 (3 code, 1 CSS) | 111 → 360 | Usage limit stopped every Developer once |
| 2 | 5 | 5 | 2 | 7 (`main.tsx` ×3, Week, DayView, Settings, SharePoster) | 361 → 630 | SM-caused `node_modules` link (#40) |
| 3 | 5 | 5 | 4 | 1 (Settings) | 630 → 698 + 5 e2e + axe + Lighthouse | Session restart; stale dependencies; a port held by a leftover server |
| 4 | 5 | 5 | 1 (one Sprint PR) | 1 (`windAtBody` duplicate) | 698 → 1,480 | Open-Meteo quota spent; GitHub connection dropped after restart |
