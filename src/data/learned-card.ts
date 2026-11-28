// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Rating } from '../engine/types';
import type { BiasState } from '../engine/science/types';
import { replayBias } from '../engine/science/personal';
import { describeBias, leanOf, type LeanLabel, type LearnedSummary } from '../engine/science/learned';

/**
 * The card's words for the stored votes. The hysteresis needs the label shown
 * at the end of each earlier rated day; one replay yields those days in order,
 * so the words cost one pass over the votes rather than one replay per day,
 * and still need no stored label.
 */
export function learnedSummary(prior: BiasState, ratings: readonly Rating[]): LearnedSummary {
  let shown: LeanLabel | undefined;
  let before: LeanLabel | undefined;
  const final = replayBias(prior, ratings, (state) => {
    before = shown;
    shown = leanOf(state.mean, shown);
  });
  // The last day's label is worked out by describeBias itself, from the one before it.
  return describeBias(final, { previous: before });
}
