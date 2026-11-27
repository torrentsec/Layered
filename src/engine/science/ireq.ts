// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * Required clothing insulation (IREQ) and Duration Limited Exposure (DLE),
 * ISO 11079:2007 Annex, after Holmér (1984, 1988).
 *
 * Ported from pythermalcomfort 4.8.1, `pythermalcomfort.models.ireq`
 * (Tartarini and Schiavon, CBE, MIT licence), which produced the reference
 * fixtures in `__fixtures__/ireq.json`. The loops copy its start values,
 * step-halving rules and stopping criteria so both land on the same fixed point.
 *
 * Checked against the ISO 11079 Annex code as reproduced by d'Ambrosio Alfano
 * et al. (2025), "On the effects of clothing area factor and vapour resistance
 * on the evaluation of cold environments via IREQ model", Int J Environ Res
 * Public Health (PMC12385740), Appendix B. pythermalcomfort, and so this port,
 * differs from that listing in four places, all kept so the fixtures hold:
 * clothing area factor 1 + 1.197·I (the Annex has 1 + 1.97·I), emissivity
 * 0.95 (0.97), evaporative resistance (0.06/0.38)·(Ia + I) (Ia/fcl + I), and
 * vapour pressure over water below 0 °C (the Annex switches to ice). Each moves
 * IREQ by well under the 0.05 clo acceptance tolerance in the cold range.
 *
 * Qlim is 40 W·h/m² (144 kJ/m², Table 1 of the paper above); the storage loop
 * works in W/m², so DLE = 40 / |S| comes out in hours.
 */

import type { DleFn, IreqFn, IreqParams, IreqResult, LightestIclForFn } from './types';

/** m²K/W per clo. */
const CLO = 0.155;
/** Tolerable body heat loss, W·h/m². */
const Q_LIM = 40;
/** ISO 11079 reports DLE only up to 8 h. */
export const DLE_CEILING_H = 8;

/** ISO 11079 applicability limits. */
export const ISO_11079_LIMITS = {
  mMin: 58,
  mMax: 400,
  taMax: 10,
  vaMin: 0.4,
  vaMax: 18,
  walkMax: 1.2,
} as const;

/** Search range for `lightestIclFor`, basic clo. */
const SOLVER_LO = 0.3;
const SOLVER_HI = 3.0;
const SOLVER_STEP = 0.005;

const SIGMA = 5.67e-8;
const EMISSIVITY = 0.95;
const AR_ADU = 0.77;
const MAX_ITER = 150;
const BALANCE_TOL = 0.01;

/** ISO 11079's lower walking-speed bound for a metabolic rate, m/s. */
export function minWalkSpeed(m: number): number {
  return Math.min(0.0052 * (m - 58), ISO_11079_LIMITS.walkMax);
}

/** Saturated vapour pressure over water, kPa (Antoine form used by ISO 11079). */
function psat(t: number): number {
  return 0.1333 * Math.exp(18.6686 - 4030.183 / (t + 235));
}

interface Env {
  ta: number;
  tr: number;
  trK4: number;
  m: number;
  w: number;
  pa: number;
  /** Respiratory heat loss, W/m²; independent of clothing. */
  res: number;
  /** Resultant boundary-layer insulation, m²K/W. */
  ia: number;
  /** Wind, walking and permeability correction from basic to resultant insulation. */
  corr: number;
}

interface Criterion {
  tsk: number;
  wetness: number;
  psk: number;
}

interface Prepared {
  env: Env;
  min: Criterion;
  neutral: Criterion;
  extended: boolean;
}

function criterion(tsk: number, wetness: number): Criterion {
  return { tsk, wetness, psk: psat(tsk) };
}

/**
 * Clamps only where the equations break down: above 400 W/m² the criteria
 * stop being physiological, and above 18 m/s the boundary-layer insulation
 * turns negative. Everything else outside the limits is computed as given and
 * flagged.
 */
function prepare(params: IreqParams): Prepared {
  const L = ISO_11079_LIMITS;
  const m = Math.min(params.m, L.mMax);
  const va = Math.min(params.va, L.vaMax);
  const walk = Math.min(params.walk, L.walkMax);
  const w = params.w ?? 0;
  const p = params.p ?? 50;
  const { ta, tr, rh } = params;

  const extended =
    ta > L.taMax ||
    params.m > L.mMax ||
    params.m < L.mMin ||
    params.va > L.vaMax ||
    params.va < L.vaMin ||
    params.walk > L.walkMax ||
    params.walk < minWalkSpeed(m);

  const tex = 29 + 0.2 * ta;
  const pa = (rh / 100) * psat(ta);
  const res = 0.0173 * m * (psat(tex) - pa) + 0.0014 * m * (tex - ta);
  const decay = Math.exp(-0.15 * va - 0.22 * walk);
  const trK = 273 + tr;

  return {
    env: {
      ta,
      tr,
      trK4: trK * trK * trK * trK,
      m,
      w,
      pa,
      res,
      ia: 0.092 * decay - 0.0045,
      corr: 0.54 * decay * Math.pow(p, 0.075) - 0.06 * Math.log(p) + 0.5,
    },
    min: criterion(33.34 - 0.0354 * m, 0.06),
    neutral: criterion(35.7 - 0.0285 * m, 0.001 * m),
    extended,
  };
}

function radiativeCoefficient(tcl: number, env: Env): number {
  const dt = tcl - env.tr;
  if (Math.abs(dt) < 1e-4) {
    const tm = 273 + (tcl + env.tr) / 2;
    return SIGMA * EMISSIVITY * AR_ADU * 4 * tm * tm * tm;
  }
  const tclK = 273 + tcl;
  return (SIGMA * EMISSIVITY * AR_ADU * (tclK * tclK * tclK * tclK - env.trK4)) / dt;
}

/** Steady-state resultant insulation for one criterion, m²K/W. */
function solveIreq(env: Env, c: Criterion): number {
  let i = 0.5;
  let step = 0.5;
  let balance = 1;
  let tcl = 0;
  let dry = 0;

  for (let n = 0; n < MAX_ITER && Math.abs(balance) > BALANCE_TOL; n++) {
    const fcl = 1 + 1.197 * i;
    const e = (c.wetness * (c.psk - env.pa)) / ((0.06 / 0.38) * (env.ia + i));
    tcl = c.tsk - i * (env.m - env.w - e - env.res);
    const hr = radiativeCoefficient(tcl, env);
    const hc = 1 / env.ia - hr;
    dry = fcl * hr * (tcl - env.tr) + fcl * hc * (tcl - env.ta);
    balance = env.m - env.w - e - env.res - dry;
    if (balance > 0) {
      i -= step;
      step /= 2;
    } else {
      i += step;
    }
  }
  return (c.tsk - tcl) / dry;
}

/** Resultant to basic insulation (m²K/W), the Annex's inverse correction. */
function toBasic(env: Env, ireq: number): number {
  const fcl = 1 + 1.197 * ireq;
  return (ireq + env.ia / fcl) / env.corr - 0.085 / fcl;
}

/**
 * Hours until the body has lost Qlim while wearing basic insulation `icl`
 * (m²K/W). The resultant insulation is refined inside the same loop as the
 * storage rate, as the reference does. Infinity when beyond 8 h or when the
 * body is not losing heat at all.
 */
function solveDle(env: Env, c: Criterion, icl: number): number {
  let s = -Q_LIM;
  let step = 500;
  let iclr = icl;
  let balance = 1;

  for (let n = 0; n < MAX_ITER && Math.abs(balance) > BALANCE_TOL; n++) {
    const fcl = 1 + 1.197 * iclr;
    iclr = (icl + 0.085 / fcl) * env.corr - env.ia / fcl;
    const e = (c.wetness * (c.psk - env.pa)) / ((0.06 / 0.38) * (env.ia + iclr));
    const tcl = c.tsk - iclr * (env.m - env.w - e - env.res - s);
    const hr = radiativeCoefficient(tcl, env);
    const hc = 1 / env.ia - hr;
    const dry = fcl * hr * (tcl - env.tr) + fcl * hc * (tcl - env.ta);
    balance = env.m - env.w - e - env.res - dry - s;
    if (balance > 0) {
      s += step;
      step /= 2;
    } else {
      s -= step;
    }
  }

  if (s === 0) return Infinity;
  const dle = -Q_LIM / s;
  return dle < 0 || dle > DLE_CEILING_H ? Infinity : dle;
}

/**
 * Both criteria, resultant and basic, in clo. Values are not clipped at zero:
 * a negative requirement means the body sheds too little heat even unclothed,
 * which the warm side reads as "as light as possible", so it is returned with
 * `extended` set.
 */
export const ireq: IreqFn = (params) => {
  const { env, min, neutral, extended } = prepare(params);
  const icl = (params.icl ?? 1.0) * CLO;

  const ireqMin = solveIreq(env, min);
  const ireqNeutral = solveIreq(env, neutral);
  const iclMin = toBasic(env, ireqMin);
  const iclNeutral = toBasic(env, ireqNeutral);

  const result: IreqResult = {
    ireqMin: ireqMin / CLO,
    ireqNeutral: ireqNeutral / CLO,
    iclMin: iclMin / CLO,
    iclNeutral: iclNeutral / CLO,
    dleMin: solveDle(env, min, icl),
    dleNeutral: solveDle(env, neutral, icl),
    extended: extended || ireqMin < 0 || iclMin < 0 || ireqNeutral < 0 || iclNeutral < 0,
  };
  return result;
};

/** DLE in hours for the basic insulation worn; Infinity beyond 8 h. */
export const dle: DleFn = (params) => {
  const { env, min, neutral } = prepare(params);
  const icl = params.icl * CLO;
  return { min: solveDle(env, min, icl), neutral: solveDle(env, neutral, icl) };
};

/** Lightest basic clo in [lo, hi] whose DLE covers `hours`; DLE rises with clo. */
function bisect(env: Env, c: Criterion, hours: number): number | undefined {
  const covers = (clo: number) => solveDle(env, c, clo * CLO) >= hours;
  if (!covers(SOLVER_HI)) return undefined;
  if (covers(SOLVER_LO)) return SOLVER_LO;
  let lo = SOLVER_LO;
  let hi = SOLVER_HI;
  while (hi - lo > SOLVER_STEP) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The lightest basic insulation (clo) that keeps the body neutral for the time
 * outside, never below what the minimal criterion needs for the same time (PO
 * decision 1, Sprint 4). Falls back to the minimal criterion when 3 clo cannot
 * keep the body neutral, and to the steady-state Icl_min when 3 clo is not
 * enough for either. Where even the search floor covers the exposure (mild
 * weather, short trips), a lighter steady-state neutral requirement wins.
 */
export const lightestIclFor: LightestIclForFn = (params, exposureHours) => {
  const { env, min, neutral } = prepare(params);
  const hours = Math.max(exposureHours, 0);

  const atMin = bisect(env, min, hours);
  const atNeutral = bisect(env, neutral, hours);

  if (atNeutral !== undefined) {
    const target = Math.max(atNeutral, atMin ?? 0);
    if (target > SOLVER_LO) return target;
    return Math.max(0, Math.min(SOLVER_LO, toBasic(env, solveIreq(env, neutral)) / CLO));
  }
  if (atMin !== undefined) return atMin;
  return Math.max(0, toBasic(env, solveIreq(env, min)) / CLO);
};
