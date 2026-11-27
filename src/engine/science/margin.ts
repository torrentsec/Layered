// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * How far the weather would have to move before the advice changes band
 * (spike #88, docs/innovation/sprint-07-what-would-change.md). It reruns the
 * clothing target on shifted weather, so the answer can never disagree with
 * the advice itself.
 */

import type { Activity, BandId, Effort } from '../types';
import { bandForClo, clothingTarget } from './target';
import type { Weather } from './types';

/** Search step and reach, K. Past the reach a forecast error is no longer "a degree or two". */
export const MARGIN_STEP = 0.5;
export const MARGIN_MAX = 5;
/** Within this shift the advice counts as close to changing. */
export const MARGIN_CLOSE = 1;

export interface MarginInput {
  hours: Weather[];
  activity: Activity;
  effort?: Effort;
  exposureHours: number;
  bias: number;
}

export interface Tip {
  /** Shift of air and radiant temperature, K, always positive. */
  by: number;
  band: BandId;
}

export interface BandMargin {
  band: BandId;
  warmer?: Tip;
  colder?: Tip;
}

const shifted = (hours: Weather[], k: number): Weather[] => hours.map((w) => ({ ...w, ta: w.ta + k, tmrt: w.tmrt + k }));

/**
 * Air and radiant temperature move together so the sun's share stays as
 * forecast: forecast misses are mostly in temperature, not in cloud.
 */
export function bandMargin(x: MarginInput): BandMargin {
  const bandAt = (k: number) => bandForClo(clothingTarget({ ...x, hours: shifted(x.hours, k) }).icl);
  const band = bandAt(0);
  const find = (sign: 1 | -1): Tip | undefined => {
    for (let by = MARGIN_STEP; by <= MARGIN_MAX + 1e-9; by += MARGIN_STEP) {
      const b = bandAt(sign * by);
      if (b !== band) return { by, band: b };
    }
    return undefined;
  };
  const warmer = find(1);
  const colder = find(-1);
  return { band, ...(warmer ? { warmer } : {}), ...(colder ? { colder } : {}) };
}

/** True when either direction changes the band within `MARGIN_CLOSE`. */
export const isClose = (m: BandMargin): boolean =>
  [m.warmer, m.colder].some((t) => t !== undefined && t.by <= MARGIN_CLOSE);
