// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * How long an outfit keeps you warm, from the Duration Limited Exposure
 * (ISO 11079 §2.5 in docs/science/thermal-model.md). The clothing target asks
 * "what is the lightest outfit for this long outside?"; this asks the reverse
 * for the outfit actually chosen, so the answer can be said in minutes instead
 * of a feels-like temperature. Prototype for #85 (Sprint 7).
 */

import { dle } from './ireq';
import { metabolicRate } from './metabolic';
import { ireqParamsFor } from './target';
import type { Metabolic, Weather } from './types';

export interface ComfortTime {
  /** Hours until you start to feel cool (DLE at neutrality); Infinity beyond 8 h. */
  warm: number;
  /** Hours until the cold is more than mild discomfort (DLE at the minimal criterion); Infinity beyond 8 h. */
  bearable: number;
  /** Index into the hours of the hour that runs out first. */
  hour: number;
  /** Basic clo the times were worked out for, after the personal bias. */
  worn: number;
}

/**
 * A personal bias says how much more insulation someone needs than the model,
 * so for the same outfit they get the warmth of `worn − bias`. Floored above
 * zero because the DLE loop has no meaning for bare skin.
 */
export const MIN_EFFECTIVE_CLO = 0.1;

/**
 * Times for the hardest hour of the window: the one whose warm time runs out
 * first. Riding takes the shorter of riding and walking, as the clothing
 * target does. `metabolic` is the one the advice used (`ScienceWhy.metabolic`).
 * Undefined with no hours or no finite clo to work from.
 */
export function comfortTime(x: { hours: Weather[]; metabolic: Metabolic; worn: number; bias: number }): ComfortTime | undefined {
  const b = Number.isFinite(x.bias) ? x.bias : 0;
  if (!x.hours.length || !Number.isFinite(x.worn)) return undefined;
  const worn = Math.max(MIN_EFFECTIVE_CLO, x.worn - b);
  const walking = metabolicRate('walking');
  const of = (w: Weather, met: Metabolic) => dle({ ...ireqParamsFor(w, met), icl: worn });
  let best: ComfortTime | undefined;
  x.hours.forEach((w, i) => {
    const own = of(w, x.metabolic);
    const walk = x.metabolic.ride > 0 ? of(w, walking) : own;
    const t = { warm: Math.min(own.neutral, walk.neutral), bearable: Math.min(own.min, walk.min), hour: i, worn };
    if (!best || t.warm < best.warm || (t.warm === best.warm && t.bearable < best.bearable)) best = t;
  });
  return best;
}
