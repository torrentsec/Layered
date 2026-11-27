Agree with modifications

**Taken:**
- Review on lead-only changes.
- Fresh agents for later phases and fix-ups.
- A short, stable rules file.
- A pitch pack.
- A skills table.
- Rerun a failing e2e once.
- Graphify `remember`.
- The strongest model for the science maths.

**Dropped:**
- Shared test fixtures by default.
- Fetching into FETCH_HEAD.

Both are acceptable as tips in the rules file.

**Required:**
1. Fix `shot.mjs` so `?flags=` survives (it builds base + "/" + hash). Otherwise a flagged screenshot silently shows the unflagged screen.
2. Add a recovery step for a lost worktree: recreate it from the pushed branch, and push before any long wait.
