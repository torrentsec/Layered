# Sprint 8

**Sprint Goal:** the suggested outfit reaches the science target, and the prototypes the Product Owner kept become the default experience.

The first Sprint under the ratified [operating model](../operating-model.md): one lead, three Developers, one-page task specs, strongest model for the engine and privacy work, a cheaper one for screen work.

## Sprint Planning

| Issue | Items | Developer (model) |
|---|---|---|
| #92 | US-080 match outfits in clo | dev-01 (strongest) |
| #93 | US-081 real temperature first, US-084 what would change this | dev-02 (cheaper) |
| #94 | US-085 votes record what was worn (D8), US-083 the learned card | dev-03 (strongest) |

Reviews: dev-03 → dev-01, dev-01 → dev-02, dev-02 → dev-03. Stakeholder instruction this Sprint: report only commits, merges and PRs.

## Daily Scrum

| Developer | Item | Collaboration |
|---|---|---|
| dev-01 | #92 | Claimed `CLO_PER_POINT` before writing it; posted Stable early; reviewed dev-02 and found a fallback that showed the wrong range |
| dev-02 | #93 | Answered dev-03's request for two lines in the feedback card; fixed both of dev-01's findings |
| dev-03 | #94 | Escalated the privacy question on the board before building; reviewed dev-01 with a golden-day run and found nothing |

**Impediments:** the usage limit stopped all three mid-wave; all resumed after the reset. dev-03 built before the lead answered its privacy escalation; the lead then accepted the design (three optional numbers on each vote travel in sync like other ratings; nothing new reaches the notification server).

**Integration:** one seam, the `FLAGS` list. Combined: 1,803 unit tests, 7 e2e, axe with no serious or critical violations, typecheck, lint and build pass.

## Sprint Review

**Sprint Goal met.**
- **US-080:** with the thermal model on, the matched outfit reaches the target: London 26 Nov is now 1.38 clo against 1.38 (was 1.17). Simple bands unchanged.
- **US-081, US-084:** Today shows the real temperature first with "Feels −9° in the wind" beneath; "what would change this" shows only within 2°. The familiar wind-chill number is gone.
- **US-085, US-083:** each new vote records the clo worn and the target, learning uses the real gap, and the "What Layered has learned about you" card is on by default under the thermal model. D8 is paid off.

**Backlog now:** US-082 mostly in shade (S), US-086 the "warm enough for 30 min" line (unblocked by US-080), then the four deferred ideas (re-score votes against observed weather, fallback sun check, household bias, changed since this morning).

## Sprint Retrospective

**What went well**
- Fewer agents, same stories: three Developers delivered three work items with every check passing.
- Early Stable commits and board claims meant integration had one seam.
- Reviewers found real defects again (a wrong fallback display, an e2e check that asserted nothing).

**What didn't**
- The usage limit stopped everyone once more, even with three agents.
- A privacy escalation went unanswered while the lead was waiting on others.

**Improvements for the next Sprint**
1. The lead answers escalations first, before waiting on any Developer.
2. Registries still collide: `FLAGS` conflicted again; move each flag to its own line.

**Token figures (hand-back usage).** First run: dev-01 166k, dev-02 132k, dev-03 212k, about 170k per item against the Sprint 6 baseline of 183k; resumed turns added about 315k because they replay each agent's history. The operating model's fresh-agent hypothesis for small fixes stays untested: both fix-ups here were resumes.
