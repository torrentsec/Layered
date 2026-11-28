// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { biasPrior } from '../../engine/science/personal';
import { forgetTemperature, temperatureVotes } from '../../engine/learning';
import { learnedSummary } from '../../data/learned-card';
import { comfort, ratings, settings } from '../../data/store';
import { toast } from '../../components/Toast';
import '../../styles/learned-card.css';

/**
 * The thermal model's temperature learning in words (#87, #94). It stands in
 * for the °C rows, which only the temperature bands read, and its Reset keeps
 * garment marks, so it clears exactly what the card describes.
 */
export function LearnedCard() {
  const prior = biasPrior(comfort.value, settings.value.manualOffset);
  const summary = learnedSummary(prior, ratings.value);
  const votes = temperatureVotes(ratings.value).length;
  return (
    <div class="row-item plain learned-card" data-certainty={summary.certainty}>
      <span class="grow">
        <span class="learned-card-head">{summary.headline}</span>
        <span class="sub">{summary.detail}</span>
      </span>
      <button
        type="button"
        class="text-btn"
        aria-label="Reset temperature learning"
        disabled={!votes}
        onClick={() => {
          ratings.value = forgetTemperature(ratings.value);
          toast('Temperature learning reset');
        }}
      >
        Reset
      </button>
    </div>
  );
}
