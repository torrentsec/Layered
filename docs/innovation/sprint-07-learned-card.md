# What Layered has learned about you (Sprint 7, issue #87)

## Question

Votes already teach the thermal model a personal clo bias (`src/engine/science/bias.ts`), but the bias itself is hidden. Settings shows °C offsets that only the simple bands read. Would a plain sentence about what has been learned, and how sure Layered is, make the advice easier to trust than a hidden offset (voice of customer, signal 8: "feels like is subjective")? And can the sentence stay put from one day to the next, so it doesn't undermine the trust it is meant to build?

## What we tried

A card behind the `learned-card` flag (`?flags=learned-card`, using the shared flag helper from #85). It shows only while the thermal model is in use. With the flag off, or with simple bands, Settings is unchanged.

- **Wording logic** (`src/engine/science/learned.ts`, pure). The bias mean gives a lean and a strength:

  | Bias (clo) | Lean |
  |---|---|
  | under 0.05 | about average, smaller than one thickness step |
  | 0.05 to 0.2 | a little |
  | 0.2 to 0.4 | clearly, about one light layer |
  | 0.4 and over | a lot |

  The filter's spread gives the certainty:

  | Spread (clo) | Certainty |
  |---|---|
  | no votes yet | from your settings |
  | 0.13 and over | early days |
  | 0.09 to 0.13 | fairly sure |
  | under 0.09 | sure |

  A 0.02 clo hysteresis keeps the words in place until the bias is clearly past a boundary.
- **No stored label.** `dailyStates` (`src/data/learned-card.ts`) replays the stored votes day by day, the same way the store builds the bias. The hysteresis is carried along the replay, so nothing new is saved on the device.
- **Two wordings for the blind read.** "About you": *You feel the cold a little*, *You run warm*. "About the advice": *Dressing you a little warmer*. To see the second, add `?wording=advice` to the address alongside the flag (`?flags=learned-card&wording=advice`). Unlike the flag, it isn't remembered, so it applies only to that visit. The line under each wording says how sure Layered is: *Fairly sure: from 9 ratings.* The third wording in the blind read is today's number row (*Overall −1.9°*).
- **How it fits the Sprint 3 section.** The card sits inside the existing "What Layered has learned" group. It replaces the °C rows (Overall and each activity) only when the thermal model dresses you, because those rows drive only the bands. Garment learning below it is untouched, and so is its per-garment reset. The section's small print still sends people to How you run to reset temperature learning.

Screenshots at 390 px: `dev09-learned-card-light.png`, `dev09-learned-card-dark.png`, `dev09-learned-card-advice.png` (advice wording) and `dev09-learned-card-new.png` (no ratings yet, "feel the cold" profile), from the Sprint 7 shot set.

## Evidence

Simulated people rated 70% of days for 60 days. There were twenty seeded people for each true bias. Each vote came from the gap between what they needed and what the advice gave, plus day-to-day noise of 0.15 clo. Every bias was rebuilt by replaying the stored votes (`src/engine/science/__tests__/learned-sim.ts`, asserted in `learned.test.ts`).

| True bias (clo) | Word changes in 60 days, no hysteresis | With hysteresis | After day 30, with hysteresis | Right lean on day 60 | Votes to "fairly sure" | Votes to "sure" |
|---|---|---|---|---|---|---|
| −0.30 | 1.6 | 1.3 | 0.10 | 20/20 | 5 | 15.7 |
| −0.12 | 0.9 | 0.8 | 0 | 20/20 | 5 | 14.9 |
| 0 | 2.8 | 0.7 | 0.05 | 18/20 | 5 | 14.6 |
| +0.12 | 1.3 | 0.8 | 0 | 20/20 | 5 | 15.0 |
| +0.30 | 2.1 | 1.3 | 0.10 | 20/20 | 5 | 15.9 |

- The words almost always end right. The two misses are average people shown as "a little" one way, which is within one thickness step.
- Hysteresis matters most for people near average. Without it their words changed 2.8 times in two months; with it, 0.7 times. Most remaining changes are the honest first steps, from "average" (no votes yet) to "a little" and then to "clearly". After the first month the words change about once in a year of ratings.
- "Fairly sure" arrives after about 5 votes. "Sure" arrives after about 15, not the 10 the static filter maths suggests, because the filter lets the bias drift a little between votes. Indoor days count for half, so office workers take about twice as long.
- Accessibility: axe (WCAG 2 A, AA and 2.2 AA) found no violations on the section in light or dark. The card is plain text with nothing to operate, so it needs no new focus states. Its meaning is in words, not colour. There is no horizontal overflow at 390 px.
- Cost: the day-by-day replay is quadratic. A year of daily ratings takes about 35 ms on a laptop, so perhaps 100 to 150 ms on a mid-range phone, on each Settings render.
- Not yet measured: whether people trust the advice more. That needs the PO and team blind read of the three wordings at Review. Asking real users is outside an innovation Sprint, and we would not track it.

## Recommendation

**Keep**, as a P2 backlog item, with four changes before it ships:

1. Use the "about you" wording, pending the blind read. "Dressing you warmer" reads as an instruction and repeats what Today already does.
2. Keep the hysteresis and the thresholds. They have tests now and the simulation backs them.
3. Work the label out incrementally, or store it alongside `cloBias`, instead of replaying day by day. That removes the quadratic cost.
4. Make temperature learning one thing. Under the thermal model, How you run still shows the bands' "Learned from your feedback −1.9°", next to a card saying "a little cold". Its Reset clears every rating, which also wipes garment learning. Either the card owns a temperature-only reset, which needs the rating record to separate the temperature vote from garment marks, or the two rows merge.

No new data, services or network calls. Everything stays on the device, so the constraints are met.
