// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { BANDS } from './bands';
import type { Requirements } from './requirements';
import type { Hour } from './types';

export type Certainty = 'high' | 'medium' | 'low';

const ORDER: readonly Certainty[] = ['high', 'medium', 'low'];

/**
 * Forecast skill falls off with lead time: the first three days are usually
 * right, a week out is a sketch. With no model spread in the feed, lead time
 * is the honest proxy.
 */
function byLeadTime(dayIndex: number): Certainty {
  if (dayIndex <= 2) return 'high';
  if (dayIndex <= 6) return 'medium';
  return 'low';
}

/**
 * A chance sitting between 30% and 60% for most of the window is the model
 * saying it doesn't know, not a forecast of light rain.
 */
export function rainUndecided(hours: Hour[]): boolean {
  if (!hours.length) return false;
  const torn = hours.filter((h) => h.precipProb >= 30 && h.precipProb <= 60).length;
  return torn * 2 >= hours.length;
}

/** How far to trust the advice for a day `dayIndex` days from today (0 = today). */
export function certaintyFor(dayIndex: number, hours: Hour[]): Certainty {
  const base = ORDER.indexOf(byLeadTime(dayIndex));
  const step = rainUndecided(hours) ? 1 : 0;
  return ORDER[Math.min(ORDER.length - 1, base + step)];
}

/** Text marker for Week rows; high certainty needs none. */
export const CERTAINTY_LABEL: Record<Certainty, string | undefined> = {
  high: undefined,
  medium: 'less certain',
  low: 'rough guide',
};

export const ROUGH_GUIDE_NOTE = 'A rough guide this far out — layers you can adjust are the safe bet.';

/**
 * Far-out temperatures are routinely a couple of degrees off, so within this
 * of a band edge the day could land in either band.
 */
export const LOW_CERTAINTY_HEDGE = 2;

const EDGES = BANDS.map((b) => b.min).filter(Number.isFinite);

/** True when the advice should lean on layers that come off or go back on easily. */
export function preferRemovable(certainty: Certainty, effective: number): boolean {
  return certainty === 'low' && EDGES.some((edge) => Math.abs(effective - edge) <= LOW_CERTAINTY_HEDGE);
}

/** Requirements with `removable` set when a low-certainty day sits near a band edge. */
export function hedgeRequirements(r: Requirements, certainty: Certainty): Requirements {
  if (r.removable || !preferRemovable(certainty, r.effective)) return r;
  return { ...r, removable: true, removableWhy: 'edge' };
}
