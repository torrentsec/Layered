# Stakeholder proposal (summary)
Objectives in order: quality; token efficiency (outcomes per token, all agents); execution time; autonomy; continuous improvement. Never trade away correctness or meaningful validation.
1. One lead agent combines PO, SM, architect, delivery coordinator, integration/QA. No dedicated PO/SM agents unless a measured benefit is shown.
2. Developers allocated by size: small change = lead only; small feature = +1; medium = +2; large = +3; complex independent workstreams = +4–5. Don't spawn because capacity exists; parallelise only when independence outweighs context, coordination and integration cost.
3. Graphify-first: query structure before reading files, narrow files, share discoveries across agents, don't regenerate needlessly; source code stays authoritative.
4. Skills-first: discover, load only relevant skill instructions, reuse workflows; skills have overhead, use when worth it; consider improving/combining skills (no changes to shared skills without permission).
5. Context: lead gives concise task specs (objective, acceptance, Graphify findings, file paths, dependencies, deliverables, ownership); Developers don't read whole histories or unrelated docs; concise reports.
6. Parallel work: ownership boundaries, interfaces agreed first, no simultaneous edits to one file, sequence coupled work; avoid the lead becoming a bottleneck.
7. Model selection: cheapest model that reliably does the task; stronger reasoning for architecture, hard debugging, security, high risk.
8. Testing proportional to risk: targeted tests during development, full suite before integration, reuse valid results, no permanent testing agent.
9. Performance beyond tokens: runtime, build, test duration; measure, don't speculate.
10. Continuous learning: short, actionable retros; improve reusable workflows.
11. Ratification: independent assessment → challenge → revised model (problem, improvement, benefit, drawbacks, implementation, measure; proven vs hypothesis vs experiment) → agree / agree with modifications / disagree → implement.
