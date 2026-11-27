// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Rating } from '../engine/types';
import type { BiasState } from '../engine/science/types';
import { replayBias } from '../engine/science/personal';

const FLAG_KEY = 'layered:spike:learned-card';

/**
 * Spike flag for issue #87, off by default so production does not change.
 * Turn it on with `?spike=learned-card` once; it stays on for that device
 * until `?spike=off`.
 */
export function learnedCardOn(search: string = globalThis.location?.search ?? '', storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = globalThis.localStorage): boolean {
  const spike = new URLSearchParams(search).get('spike');
  try {
    if (spike === 'learned-card') storage?.setItem(FLAG_KEY, '1');
    else if (spike === 'off') storage?.removeItem(FLAG_KEY);
    return storage?.getItem(FLAG_KEY) === '1';
  } catch {
    // Storage blocked: honour the URL for this visit only.
    return spike === 'learned-card';
  }
}

/**
 * The bias at the end of each rated day, oldest first, rebuilt the same way
 * the store rebuilds it, so the card's words carry their hysteresis without a
 * stored label.
 */
export function dailyStates(prior: BiasState, ratings: readonly Rating[]): BiasState[] {
  const dates = [...new Set(ratings.map((r) => r?.date).filter((d): d is string => typeof d === 'string'))].sort();
  return dates.map((d) => replayBias(prior, ratings.filter((r) => r && r.date <= d)));
}
