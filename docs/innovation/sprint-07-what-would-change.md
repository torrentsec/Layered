# What would change this? (Sprint 7, issue #88)

**Status:** prototype on `spike/88-what-would-change`, off by default. Turn it on with `?flags=margin` in the address (remembered on the device; `?flags=` turns it off).

## Question

Does showing how far the weather would have to move before the advice changes make "Why this?" feel reasoned rather than arbitrary? And how often is a day within a degree of changing band?

## What we tried

- `bandMargin()` (`src/engine/science/margin.ts`) reruns the existing clothing target (`clothingTarget`, `bandForClo`) with air and radiant temperature shifted together, in 0.5 K steps up to 5 K each way. It returns the smallest shift that changes the band in each direction. It reuses the engine, so the margin can't disagree with the advice.
- `adviceMargin()` (`src/data/margin-text.ts`) runs it on the advice's own window hours, exposure and bias. It returns nothing if the rerun lands on a different band from the one shown (a merged commute or a hedged far-off day), because a margin from the wrong starting point would mislead.
- "Why this?" gets a new section, **What would change this**, after Clothing warmth. It has a row for each direction that changes the advice within 5 °C (9 °F), such as "4° warmer: Coat on". A direction that holds is stated as a plain sentence instead, such as "Same advice even 5° colder." When a shift of 1° changes the advice, it adds "A one-degree forecast miss would change this, so check again before you go." Degrees are whole numbers in the reader's unit, rounded up, and the one-degree test uses those same degrees, so it holds in °F too.
- The flag is the Sprint's shared `flagOn('margin')` (`src/data/flags.ts`, from #85). The margin is only worked out while the sheet is open.

## Evidence

**How often advice is within a degree of changing.** Here, "close" means 1 °C or less either way.

| Set | Close | Notes |
|---|---|---|
| Six golden days, 30-minute walk | 1 of 6 | Mild April day: 1° warmer gives "Light layer optional". London and cloudy 8° stay "Coat on" for 5° either way. |
| Mocked London fortnight, walk, cycle and run, 14 days | 5 of 42 (12%) | All five are runs. Running changes between "T-shirt weather" and "Light layer optional" from day to day as the fortnight cools by 0.3° a day. No walk or ride was close. |
| Engine sweep: −8 to 26 °C × 3 winds × 3 sky states × 3 exposures, walking | 244 of 945 (26%) | Coat 11%, Bundle up 13%, Jacket 53%, Two layers 56%, Light layer 44%, T-shirt 21%. |

What this shows:

- The Coat band is wide. Because the target is capped at the coat plan's warmth (`NEUTRAL_REACH_CLO`), it runs from about −5 to 10 °C. Winter advice is stable, and the section mostly says "Same advice within 5° either way". That is reassuring, but there is little new to learn from it.
- In spring and autumn (Jacket, Two layers, Light layer), about half of all conditions are within a degree of another band. That is where forecast error matters, and where the line earns its place.
- The running results in the fortnight point to an existing problem. Runners' advice changes between T-shirt and light layer from one day to the next. The margin line makes that visible and honest, but it doesn't fix it.

**Accessibility.** At 390 px and 320 px, in light and dark, nothing scrolls sideways (`scrollWidth` 320 at 320 px). The section uses the sheet's existing heading, list and row patterns. In the accessibility tree it reads as a level-2 heading "What would change this", then an intro paragraph and a one-item list ("4° warmer Coat on") and the sentence "Same advice even 5° colder.". The rows have no separator between label and value, as in the rest of "Why this?". With the flag off, the section is not in the tree, so production is unchanged.

Screenshots: `dev-10-margin-390-light`, `dev-10-margin-390-dark`, `dev-10-margin-320-light` and `dev-10-margin-320-dark` (Sprint 7 Review deck).

**Not yet tried:** reading the three wordings aloud with the PO and team, and any test with real people. The question of trust is still open.

## Recommendation

**Keep, narrowed.** Make it a backlog item that shows the section only when a shift of 2° or less changes the band, and leaves it out otherwise. In winter the section mostly says "Same advice within 5° either way", which adds length without adding meaning. In spring and autumn it flags the days when people should look again.

Before building it:

- Use the read-aloud to choose the final wording.
- Decide whether the morning notification should carry the close note.

Running's day-to-day flip between T-shirt and light layer should go to the science backlog as its own item.
