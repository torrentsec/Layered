// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * The basic insulation an outfit must reach for a window outside, and the
 * verdict band it falls in. docs/science/thermal-model.md §2.5, §4, §9.1;
 * docs/science/backlog.md S7.
 */

import type { Activity, BandId, Effort } from '../types';
import { ireq, ISO_11079_LIMITS, lightestIclFor } from './ireq';
import { metabolicRate } from './metabolic';
import { airSpeedAtBody } from './radiation';
import type { BandForCloFn, ClothingTarget, ClothingTargetFn, IreqParams, Metabolic, UtciCategory, UtciResult, Weather } from './types';
import { weatherUtci } from './utci';

/** Lower edge of each band above `tshirt`, basic clo (thermal-model §9.1). */
export const CLO_BAND_EDGES: ReadonlyArray<readonly [number, BandId]> = [
  [1.5, 'bundle'],
  [1.25, 'coat'],
  [0.95, 'jacket'],
  [0.7, 'two'],
  [0.5, 'light'],
];

/** Each band's own layer plan summed with ISO 9920 (clothing.json → bandPlans). */
export const BAND_PLAN_CLO: Record<BandId, number> = {
  tshirt: 0.36,
  light: 0.6,
  two: 0.84,
  jacket: 1.09,
  coat: 1.38,
  bundle: 1.66,
};

/** How close to an edge a target counts as borderline, clo. */
export const CLO_EDGE_HEDGE = 0.08;
/** Wider when radiation came from cloud cover or UTCI inputs were clamped. */
export const CLO_EDGE_HEDGE_WIDE = 0.15;

/** IREQ stops being the lever below this: the light ladder takes over (§4). */
export const HEAT_LADDER_CLO = 0.5;
/** Above this air temperature the IREQ extension is not trusted at all. */
export const HEAT_LADDER_TA = 20;
/** Below this a light layer is not worth carrying. */
const LIGHT_LAYER_CLO = 0.3;

export const bandForClo: BandForCloFn = (icl) => {
  for (const [edge, band] of CLO_BAND_EDGES) if (icl >= edge) return band;
  return 'tshirt';
};

/** True when `icl` is within `hedge` of a band edge, so the outer layer is borderline. */
export function nearCloEdge(icl: number, hedge: number = CLO_EDGE_HEDGE): boolean {
  return CLO_BAND_EDGES.some(([edge]) => Math.abs(icl - edge) <= hedge);
}

const HEAT: ReadonlySet<UtciCategory> = new Set(['moderate-heat', 'strong-heat', 'very-strong-heat', 'extreme-heat']);

export interface HourTarget {
  /** Basic clo this hour asks for, before bias. */
  icl: number;
  /** Steady-state ISO 11079 values for the hour, basic clo. */
  iclMin: number;
  iclNeutral: number;
  utci: UtciResult;
  basis: ClothingTarget['basis'];
}

/**
 * Up to this much insulation the target is full neutrality, whatever the time
 * outside: an everyday coat outfit gets there, so nobody should accept feeling
 * cool to save a jumper. Past it the exposure-limited DLE target
 * (thermal-model §2.5) takes over, which keeps a winter commute out of 2 clo.
 */
export const NEUTRAL_REACH_CLO = BAND_PLAN_CLO.coat;

/**
 * Air temperatures between which the sun's warmth fades out of the target.
 * The IREQ extension above 10 °C was only cross-checked against PMV, which
 * has no direct sun, so radiant gain is phased out over 5 K either side of
 * that limit; a sharper fade would let a sunny day ask for less as it cools.
 * A clear-sky deficit always counts.
 */
export const SUN_FADE_TA = [ISO_11079_LIMITS.taMax - 5, ISO_11079_LIMITS.taMax + 5] as const;

function radiantTemp(w: Weather): number {
  const gain = w.tmrt - w.ta;
  if (gain <= 0) return w.tmrt;
  const [full, none] = SUN_FADE_TA;
  const share = Math.min(1, Math.max(0, (none - w.ta) / (none - full)));
  return w.ta + share * gain;
}

/** ISO 11079 inputs for one hour and body heat, as the clothing target sees them. */
export function ireqParamsFor(w: Weather, met: Metabolic): Omit<IreqParams, 'icl'> {
  // A cyclist meets the wind plus their own speed; a walker's own breeze is IREQ's `walk` term.
  return {
    ta: w.ta,
    tr: radiantTemp(w),
    va: airSpeedAtBody(w.wind10, met.ride),
    rh: w.rh,
    m: met.m,
    w: met.w,
    walk: met.walk,
  };
}

function ireqTarget(w: Weather, activity: Activity, effort: Effort | undefined, exposureHours: number) {
  const params = ireqParamsFor(w, metabolicRate(activity, effort));
  const steady = ireq(params);
  const needed = Math.max(lightestIclFor(params, exposureHours), Math.min(steady.iclNeutral, NEUTRAL_REACH_CLO));
  return { steady, needed };
}

/**
 * One hour outside. Cycling never comes out lighter than walking in the same
 * weather (PO, Sprint 5 golden days): freewheeling and waiting at lights cut
 * the heat a rider makes while the air keeps moving past.
 */
export function targetHour(w: Weather, activity: Activity, effort: Effort | undefined, exposureHours: number): HourTarget {
  const { steady, needed: own } = ireqTarget(w, activity, effort, exposureHours);
  const needed = activity === 'cycling' ? Math.max(own, ireqTarget(w, 'walking', undefined, exposureHours).needed) : own;
  const u = weatherUtci(w);
  const base = { iclMin: steady.iclMin, iclNeutral: steady.iclNeutral, utci: u };

  // Above 20 °C the ladder wins even when the extension asks for more: past its
  // range IREQ's answer to wind or cloud is not trusted over a light layer.
  if (needed <= HEAT_LADDER_CLO || w.ta > HEAT_LADDER_TA) {
    const tshirt = HEAT.has(u.category) || needed < LIGHT_LAYER_CLO;
    return { ...base, icl: tshirt ? BAND_PLAN_CLO.tshirt : BAND_PLAN_CLO.light, basis: 'heat-ladder' };
  }
  // Just past the ladder the target meets the ladder's light plan, so a colder hour never asks for less.
  return { ...base, icl: Math.max(needed, BAND_PLAN_CLO.light), basis: steady.extended ? 'ireq-extended' : 'ireq' };
}

/**
 * The outfit has to cope with the hardest hour outside, so the target is the
 * maximum over `hours`, which holds only the hours the person is out. With no
 * hours there is nothing to dress for and only the bias remains.
 */
export const clothingTarget: ClothingTargetFn = ({ hours, activity, effort, exposureHours, bias }) => {
  const b = Number.isFinite(bias) ? bias : 0;
  const exposure = Math.max(0, exposureHours);
  let worst: HourTarget | undefined;
  for (const w of hours) {
    const h = targetHour(w, activity, effort, exposure);
    if (!worst || h.icl > worst.icl) worst = h;
  }
  if (!worst) return { icl: Math.max(0, b), floor: 0, neutral: 0, bias: b, exposureHours: exposure, basis: 'heat-ladder' };
  return {
    icl: Math.max(0, worst.icl + b),
    floor: worst.iclMin,
    neutral: worst.iclNeutral,
    bias: b,
    exposureHours: exposure,
    basis: worst.basis,
  };
};
