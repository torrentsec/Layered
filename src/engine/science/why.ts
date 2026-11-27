// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { ClothingTarget, Metabolic, UtciResult, Weather } from './types';

/**
 * What the science engine hands to "Why this?" (docs/science/thermal-model.md
 * §9.3). Every number is one the engine already computed; the UI only words it.
 * Set on `Advice.science` when the science engine produced the advice.
 */
export interface ScienceWhy {
  /** Local time of the window hour with the lowest UTCI. */
  coldestHour: string;
  /** Air temperature at that hour, °C. */
  ta: number;
  utci: UtciResult;
  /** Tmrt − ta at that hour, K: positive when the sun warms, negative under a clear night sky. */
  tmrtDelta: number;
  radiation: Weather['radiation'];
  /** UTCI over the window's hours, °C. NaN-free: hours without a trustworthy number are left out. */
  feels: { min: number; max: number };
  metabolic: Metabolic;
  exposureMinutes: number;
  target: ClothingTarget;
  /** ISO 9920 sum of the chosen layers, when they could be summed. */
  outfit?: { basic: number; windLoss: number };
  /** Ratings behind the personal adjustment (BiasState.count). */
  biasCount: number;
}
