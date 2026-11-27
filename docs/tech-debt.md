# Technical debt register

Debt we know about, why it matters and what pays it off. Every Sprint takes at least one item from here into its Sprint Backlog (see [process](process.md)). Items leave the register when they are paid off, with the PR that did it.

| # | Debt | Why it matters | Pay-off | Size | State |
|---|---|---|---|---|---|
| D1 | 36 merged branches left on GitHub (every `feat/*`, `fix/*`, `chore/*`, `spike/*` and `integration/*` up to Sprint 5 Planning) | Noise: it's hard to see what's in flight, and dead branches look like unfinished work | Delete them, and turn on automatic deletion of merged branches so it can't recur. All 36 were checked: every one is merged into `main` through a PR, or through the Sprint 4 integration PR (#66) | S | **Blocked on the maintainer**: the development network can't delete remote branches |
| D2 | Two advice engines side by side while the science engine is behind a flag | Double the code to maintain and test; easy to fix one and forget the other | Switch to the science engine, then remove the band engine's insulation rules and their tests | M | Planned after the Sprint 5 comparison |
| D3 | Graphify index stuck at `e4ea976` | Developers fall back to text search for the newest code, so impact checks miss the science engine | Rebuild the index; confirm pushes re-index | S | **Blocked on the maintainer** |
| D4 | Release tags `v0.1.0` to `v1.0.0` exist only in the development checkout | GitHub shows no releases; the changelog has no anchors | Create the five tags and releases on GitHub | S | **Blocked on the maintainer** (tag pushes are refused from development) |
| D5 | Integration branches arrive on `main` as one squash of several features (#66) | One commit per Sprint hides which story changed what | Merge each feature PR on its own, in the planned order, and keep the integration branch for checking only | S | Adopt from Sprint 5 integration |
| D6 | `ireq.test.ts` sits beside its module while every other science test is in `__tests__/` | Inconsistent layout; tests are easy to miss | Move it | XS | Open |
| D7 | Each saved place stores about 88 kB of forecast in `localStorage` since #64 | Many places and trips could approach the browser's storage limit and fail silently | Store only the fields the engines read, or move forecasts to IndexedDB; add a test with 20 places | M | Open |
| D8 | Ratings don't record what was worn or the model's target | The clo bias learns at a fixed step instead of from the real gap | Store worn and target clo with each new rating | S | Open (from #70) |
