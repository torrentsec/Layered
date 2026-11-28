// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Puts the personal clo bias into plain words, with how sure Layered is,
 * for the "What Layered has learned" card (#87, shipped in #94).
 */

import type { BiasState } from './types';

export type Lean = 'cold' | 'warm' | 'average';
export type Strength = 'a little' | 'clearly' | 'a lot';
export type Certainty = 'settings' | 'early' | 'fair' | 'sure';

/**
 * Below this the bias is smaller than the gap between two neighbouring
 * thicknesses of one garment, so calling it a lean would overclaim.
 */
export const AVERAGE_BAND = 0.05;
/** About one light layer (a thin long-sleeve top is roughly 0.2 clo). */
export const CLEAR_LEAN = 0.2;
export const STRONG_LEAN = 0.4;
/**
 * Spread thresholds, clo. The spread falls below 0.13 after about four outdoor
 * votes. It falls below 0.09 after about fifteen when people rate most days,
 * because the filter lets the bias drift a little between votes; by then one
 * vote moves the bias by less than a tenth of a light layer.
 */
export const EARLY_SPREAD = 0.13;
export const SURE_SPREAD = 0.09;
/**
 * A lean must clear its boundary by this much before the label changes, so a
 * bias sitting on a threshold does not flip the words every other day.
 */
export const HYSTERESIS = 0.02;

export interface LearnedSummary {
  lean: Lean;
  strength?: Strength;
  certainty: Certainty;
  headline: string;
  detail: string;
}

export interface LeanLabel {
  lean: Lean;
  strength?: Strength;
}

function rawLean(mean: number): LeanLabel {
  const m = Math.abs(mean);
  if (!(m >= AVERAGE_BAND)) return { lean: 'average' };
  const lean: Lean = mean > 0 ? 'cold' : 'warm';
  return { lean, strength: m >= STRONG_LEAN ? 'a lot' : m >= CLEAR_LEAN ? 'clearly' : 'a little' };
}

/** Lower edge of a label's band of |mean|, for the hysteresis check. */
function bandFloor(l: LeanLabel): number {
  if (l.lean === 'average') return 0;
  return l.strength === 'a lot' ? STRONG_LEAN : l.strength === 'clearly' ? CLEAR_LEAN : AVERAGE_BAND;
}

function bandCeiling(l: LeanLabel): number {
  if (l.lean === 'average') return AVERAGE_BAND;
  return l.strength === 'a lot' ? Infinity : l.strength === 'clearly' ? STRONG_LEAN : CLEAR_LEAN;
}

const sameLabel = (a: LeanLabel, b: LeanLabel) => a.lean === b.lean && a.strength === b.strength;

/**
 * The lean for a bias. With the label shown last time, it only changes once
 * the bias is clearly past the boundary.
 */
export function leanOf(mean: number, previous?: LeanLabel): LeanLabel {
  const next = rawLean(mean);
  if (!previous || sameLabel(next, previous)) return next;
  const m = Math.abs(mean);
  // A held lean must still point the same way: once the bias crosses zero, "feel the cold" is wrong.
  const sameSide = previous.lean === 'average' || (previous.lean === 'cold' ? mean > 0 : mean < 0);
  const inside = sameSide && m > bandFloor(previous) - HYSTERESIS && m < bandCeiling(previous) + HYSTERESIS;
  return inside ? previous : next;
}

export function certaintyOf(state: Pick<BiasState, 'variance' | 'count'>): Certainty {
  if (!(state.count > 0)) return 'settings';
  const spread = Math.sqrt(Math.max(0, state.variance));
  if (!Number.isFinite(spread) || spread >= EARLY_SPREAD) return 'early';
  return spread >= SURE_SPREAD ? 'fair' : 'sure';
}

/**
 * Worded about the person, not the advice: it is how people describe
 * themselves, and "dressing you warmer" would only repeat what Today does.
 */
const PERSON: Record<Lean, Record<Strength, string> | string> = {
  cold: { 'a little': 'You feel the cold a little', clearly: 'You feel the cold', 'a lot': 'You feel the cold a lot' },
  warm: { 'a little': 'You run a little warm', clearly: 'You run warm', 'a lot': 'You run very warm' },
  average: 'You’re about average',
};

const ratingsText = (n: number) => `${n} rating${n === 1 ? '' : 's'}`;

function detailOf(certainty: Certainty, count: number): string {
  switch (certainty) {
    case 'settings':
      return 'From your comfort settings. Rate a few days to fine-tune it.';
    case 'early':
      return `Early days: from ${ratingsText(count)}.`;
    case 'fair':
      return `Fairly sure: from ${ratingsText(count)}.`;
    case 'sure':
      return `Sure: from ${ratingsText(count)}.`;
  }
}

export function describeBias(state: BiasState, opts: { previous?: LeanLabel } = {}): LearnedSummary {
  const { lean, strength } = leanOf(Number.isFinite(state.mean) ? state.mean : 0, opts.previous);
  const entry = PERSON[lean];
  const headline = typeof entry === 'string' ? entry : entry[strength ?? 'a little'];
  const certainty = certaintyOf(state);
  return { lean, strength, certainty, headline, detail: detailOf(certainty, state.count) };
}

/**
 * How often the words change across a run of daily states, with and without
 * hysteresis. Used by the spike's evidence; also a guard for later tuning.
 */
export function labelFlips(states: readonly BiasState[], hysteresis = true): number {
  let flips = 0;
  let prev: LeanLabel | undefined;
  for (const s of states) {
    const next = leanOf(s.mean, hysteresis ? prev : undefined);
    if (prev && !sameLabel(prev, next)) flips++;
    prev = next;
  }
  return flips;
}
