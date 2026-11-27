// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Personal insulation bias: a one-dimensional Kalman filter over comfort votes
 * (docs/science/thermal-model.md §8.3; Kalman 1960). The bias is added to the
 * model's clothing target, so a positive bias means "dress warmer".
 */

import type { BiasState, UpdateBiasFn } from './types';

/** Prior spread of preferred insulation between people, clo (σ0 = 0.25). */
export const BIAS_PRIOR_VARIANCE = 0.0625;
/** Drift allowed per day, clo²: about 0.1 clo a month. */
export const BIAS_PROCESS_NOISE = 0.0004;
/** Noise of one vote, clo² (±0.3 clo). */
export const BIAS_VOTE_NOISE = 0.09;
/** What one vote "asks" for, clo. */
export const BIAS_VOTE_STEP = 0.15;
export const BIAS_LIMIT = 0.6;
/** PO decision 6: existing °C learning carries over at this rate. */
export const CLO_PER_CELSIUS = 0.07;

const DAY_MS = 86_400_000;

const clampBias = (b: number): number => Math.min(BIAS_LIMIT, Math.max(-BIAS_LIMIT, b)) || 0;

function dayNumber(date: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return undefined;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

/**
 * Starting state from an existing °C offset (comfort profile plus learned
 * offsets). The old offsets were added to the effective temperature, so a
 * negative offset means "feels colder" and maps to more clo.
 */
export function migrateOffsetToClo(celsiusOffset: number): BiasState {
  const mean = Number.isFinite(celsiusOffset) ? clampBias(-CLO_PER_CELSIUS * celsiusOffset) : 0;
  return { mean, variance: BIAS_PRIOR_VARIANCE, updated: '', count: 0 };
}

/**
 * Applies one vote: −1 too cold, 0 just right, +1 too warm. When both the
 * insulation worn and the model's target are known the observation is what
 * the person actually needed; otherwise it is one step from the bias held at
 * the start of the day. Observations within a day share that reference, which
 * makes them ordinary Kalman measurements: their order does not change the
 * result. A vote dated before `updated` (a late replay) or not a YYYY-MM-DD
 * date is applied without drift and leaves `updated` alone.
 */
export const updateBias: UpdateBiasFn = (state, vote, date, opts = {}) => {
  const last = dayNumber(state.updated);
  const today = dayNumber(date);
  const gap = last === undefined || today === undefined ? 0 : today - last;
  const sameDay = gap === 0 && state.updated === date;
  // Without the cap a long break would make the next vote count for more than a first vote.
  const p = Math.min(BIAS_PRIOR_VARIANCE, state.variance + BIAS_PROCESS_NOISE * Math.max(0, gap));
  const reference = sameDay && state.dayMean !== undefined ? state.dayMean : state.mean;

  const { wornIcl, modelIcl, mostlyIndoors } = opts;
  const known = wornIcl !== undefined && modelIcl !== undefined && Number.isFinite(wornIcl) && Number.isFinite(modelIcl);
  const z = (known ? wornIcl - modelIcl : reference) - vote * BIAS_VOTE_STEP;
  const r = mostlyIndoors ? BIAS_VOTE_NOISE * 2 : BIAS_VOTE_NOISE;
  const k = p / (p + r);
  const mean = clampBias(state.mean + k * (z - state.mean));
  const variance = (1 - k) * p;
  const count = state.count + 1;

  if (gap < 0 || today === undefined) return { ...state, mean, variance, count };
  return { mean, variance, updated: date, count, dayMean: reference };
};
