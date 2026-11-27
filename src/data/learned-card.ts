// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Rating } from '../engine/types';
import type { BiasState } from '../engine/science/types';
import { replayBias } from '../engine/science/personal';

/**
 * The bias at the end of each rated day, oldest first, rebuilt the same way
 * the store rebuilds it, so the card's words carry their hysteresis without a
 * stored label.
 */
export function dailyStates(prior: BiasState, ratings: readonly Rating[]): BiasState[] {
  const dates = [...new Set(ratings.map((r) => r?.date).filter((d): d is string => typeof d === 'string'))].sort();
  return dates.map((d) => replayBias(prior, ratings.filter((r) => r && r.date <= d)));
}
