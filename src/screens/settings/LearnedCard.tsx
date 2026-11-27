// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { describeHistory, type Wording } from '../../engine/science/learned';
import { biasPrior } from '../../engine/science/personal';
import { dailyStates } from '../../data/learned-card';
import { comfort, ratings, settings } from '../../data/store';
import '../../styles/learned-card.css';

function wordingFromUrl(): Wording {
  return new URLSearchParams(globalThis.location?.search ?? '').get('wording') === 'advice' ? 'advice' : 'person';
}

/**
 * The thermal model's temperature learning in words (spike, issue #87). It
 * stands in for the °C rows, which only the temperature bands read.
 */
export function LearnedCard() {
  const prior = biasPrior(comfort.value, settings.value.manualOffset);
  const states = dailyStates(prior, ratings.value);
  const summary = describeHistory(states.length ? states : [prior], wordingFromUrl());
  if (!summary) return null;
  return (
    <div class="row-item plain learned-card" data-certainty={summary.certainty}>
      <span class="grow">
        <span class="learned-card-head">{summary.headline}</span>
        <span class="sub">{summary.detail}</span>
      </span>
    </div>
  );
}
