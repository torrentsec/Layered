# How we work: Scrum

Layered is built with Scrum as defined in the [Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html). This page records how we apply it. Where it and the Guide differ, the Guide wins.

## Scrum Teams

The Guide says a Scrum Team is typically 10 or fewer people, so the 12 of us work as **two Scrum Teams on one product**. Both share one Product Owner, one Product Backlog and one Product Goal. One Scrum Master serves both teams.

| Accountability | Who |
|---|---|
| Product Owner | `po`: maximises the value of the product, owns and orders the Product Backlog, and states the Product Goal |
| Scrum Master | `sm`: accountable for the teams' effectiveness. Coaches Scrum, removes impediments, and makes sure the events happen and stay in their timeboxes |
| Developers, Team Circle ● | `dev-01` … `dev-05` |
| Developers, Team Square ■ | `dev-06` … `dev-10` |

Handles are accountabilities, not people. Every commit is made under the maintainer's identity. The teams are cross-functional and self-managing: the Developers decide how to turn Product Backlog items into a Done Increment.

## Commitments

- **Product Goal** (for the Product Backlog): *A free, private app that consistently tells you what to wear from the weather, the clothes you own and how you feel the cold.*
- **Sprint Goal** (for the Sprint Backlog): one objective per Sprint, set at Sprint Planning and recorded in that Sprint's doc.
- **Definition of Done** (for the Increment): see below. Work that doesn't meet it doesn't ship and goes back to the Product Backlog.

## Events

The Developers are software agents working in parallel, so wall-clock timeboxes would mean nothing: a Sprint's build work takes minutes, not weeks. We keep the purpose of each timebox, which is to bound the work and force inspection, but measure it in **work** rather than time.

| Event | Timebox | Output |
|---|---|---|
| **Sprint** | One integration cycle: Planning → one parallel build wave → at most one fix-up wave → Review → Retro. Fixed: when the fix-up wave ends, the Sprint ends, whether or not every item is Done | `docs/sprints/sprint-NN.md` |
| **Sprint Planning** | Ends when the Sprint Goal, the selected items per team and the **contracts** (shared types and module boundaries) are on `main`. No feature code before that | Sprint Goal, Sprint Backlogs, contracts commit |
| **Daily Scrum** | One per wave, when the Developers' branches come back. It inspects progress towards the Sprint Goal, impediments and merge order, then adapts the plan for the rest of the Sprint | Notes in the Sprint doc |
| **Sprint Review** | Ends when the Increment is deployed and inspected against the Sprint Goal, and the Product Backlog has been adapted. Stakeholder feedback is gathered asynchronously | Review notes, backlog changes |
| **Sprint Retrospective** | Ends when at least one improvement is chosen and added to the next Sprint Backlog | Retro notes |

**Product Backlog refinement** is ongoing: items are split until a single Developer can make each one Done in one wave.

Items that aren't Done when the Sprint ends are not counted towards the Increment. They go back to the Product Backlog for the PO to re-order.

## Artifacts

- **Product Backlog:** [`docs/requirements.md`](requirements.md) holds the stories, and GitHub issues are the Product Backlog items, ordered by the PO.
- **Sprint Backlog:** the Sprint Goal, the issues selected (labelled `sprint-N`, plus `team-circle` or `team-square`) and the Developers' plan, all in the Sprint doc.
- **Increment:** every merge to `main` that meets the Definition of Done is deployed to production. More than one Increment may be created in a Sprint. Each Sprint is tagged `v0.N.0`.

## Definition of Done

An Increment is Done when:

1. It meets the acceptance criteria of its Product Backlog item.
2. Engine rules have unit tests at their threshold edges, and other logic is tested where it can fail.
3. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass in CI.
4. It has been reviewed in a pull request by a Developer other than the author, and squash-merged with a Conventional Commit title.
5. Screens have been checked at phone width in light and dark, with accessible names, focus order and AA contrast.
6. There are no secrets, tracking or AI references in the repo, and source headers are present.
7. `docs/requirements.md` statuses and any user-facing docs are updated.
8. It is deployed to production from `main`.
9. Its branch is deleted once merged, and any debt it knowingly leaves is in [`docs/tech-debt.md`](tech-debt.md).

## Engineering practices

- **Trunk-based development** with short-lived branches: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`.
- **Contracts first.** Shared types and module boundaries are agreed at Sprint Planning and land on `main` before parallel work starts, so the two teams work on separate files.
- **Technical debt is planned work.** Debt lives in [`docs/tech-debt.md`](tech-debt.md). Each Sprint takes at least one debt item into its Sprint Backlog, chosen at Planning like any other item.
- **Developers collaborate through a team board.** Each wave shares one board. Developers post what they need and offer before coding, claim shared helpers so each exists once, ask the owner instead of copying, and review each other's branches before integration. The SM facilitates and removes blockers; it doesn't decide code.
- **Conventional Commits** and squash merges keep `main` readable.
- **Security.** Cloudflare credentials live only in GitHub Actions secrets, and runtime keys in Worker secrets.

## Interaction logs

Every agent keeps an interaction log in [`docs/team/logs/`](team/logs/): one file per Developer (`dev-01.log` to `dev-10.log`), plus `scrum-master.log` and `product-owner.log`. Each line records one interaction with another agent, as it happens:

```
2026-11-27T12:38:30Z | dev-07 -> dev-06 | question | will you add ride speed inside clothingTarget?
```

The sender writes the line to its own log and to the recipient's. Types: claim, offer, need, question, answer, stable, review, handback, brief, decision, impediment, note. Requests from the stakeholder appear in the Product Owner's log. The logs are committed with each Sprint, after a check for paths, secrets and tool names, so the repo shows who asked whom for what and when. Sprint 5 was back-filled from its team board without times.

## Innovation Sprints

Feature Sprints keep the Developers busy with known work, so new ideas rarely get tried. Every fourth Sprint is an **innovation Sprint**. It is still a Sprint, with every Scrum event, but its goal is learning rather than shipping.

| | Feature Sprint | Innovation Sprint |
|---|---|---|
| **Sprint Goal** | Deliver backlog items | Learn which new ideas are worth building, e.g. "find out whether X makes advice better" |
| **Where items come from** | The Product Backlog, ordered by the PO | Developers pitch ideas at Planning, drawing on voice-of-customer research, the science backlog, the tech-debt register and their own curiosity. The PO picks up to five against the product vision |
| **Done means** | The Definition of Done | A working prototype behind a flag or on a `spike/*` branch, a short write-up in `docs/innovation/` (question, what was tried, evidence, recommendation) and a demo at Review. Production behaviour doesn't change |
| **Review** | Inspect the Increment | Keep or drop each idea. Kept ideas become Product Backlog items, sized and ordered like any other |
| **Retrospective** | As usual | Also asks whether the cadence is right |

Constraints still apply: no paid services, no tracking, everything within the free tier, and nothing that weakens privacy. A prototype that would need any of those is written up and dropped.

**Cadence:** Sprints 7, 11, 15 and so on. The PO may move one by a Sprint to protect a release, but not skip it.

## History before Scrum

Releases `v0.1.0` and `v0.2.0` were built by the maintainer before the team adopted Scrum. They are recorded in [CHANGELOG.md](../CHANGELOG.md) but not as Sprints.
