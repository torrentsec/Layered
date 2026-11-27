// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * UTCI operational procedure: the 6th-order regression polynomial of
 * Bröde et al. (2012), "Deriving the operational procedure for the Universal
 * Thermal Climate Index (UTCI)", Int J Biometeorol 56(3), 481–494.
 *
 * Coefficients are from UTCI_a002.f90 (Version a 0.002, October 2009,
 * Peter Bröde, www.utci.org) and were checked term by term against the
 * MIT-licensed pythermalcomfort 4.8.1 port (Copyright (c) 2019 Federico
 * Tartarini, pythermalcomfort.models.utci): all 210 terms are identical.
 * Saturation vapour pressure is Hardy (1998) ITS-90, as in both sources.
 * Stress categories follow the UTCI Assessment Scale (www.utci.org), with the
 * upper edge of each bin inclusive as in pythermalcomfort.
 */

import type { UtciCategory, UtciCategoryFn, UtciFn } from './types';

/** Wind at 10 m that the polynomial was fitted for, m/s. Calm forecast hours sit below 0.5. */
export const UTCI_WIND_RANGE = [0.5, 17] as const;
/** Tmrt − ta, K. */
export const UTCI_DTMRT_RANGE = [-30, 70] as const;
/** ta, °C. */
export const UTCI_TA_RANGE = [-50, 50] as const;
/** Above this vapour pressure (kPa) the regression has no data behind it. */
export const UTCI_PA_MAX = 5;

// Hardy (1998) ITS-90 coefficients: g0..g6 for tk^(i−2), g7 for ln(tk).
const G = [-2.8365744e3, -6.028076559e3, 1.954263612e1, -2.737830188e-2, 1.6261698e-5, 7.0229056e-10, -1.8680009e-13];
const G7 = 2.7150305;

/** Saturation vapour pressure over water, hPa. */
export function saturationVapourPressure(ta: number): number {
  const tk = ta + 273.15;
  let es = G7 * Math.log(tk);
  for (let i = 0; i < G.length; i++) es += G[i] * tk ** (i - 2);
  return Math.exp(es) * 0.01;
}

// [coefficient, power of ta, power of va, power of (Tmrt − ta), power of pa],
// in the order of UTCI_a002.f90. The polynomial is ta + Σ terms.
const TERMS: readonly (readonly [number, number, number, number, number])[] = [
  [0.607562052, 0, 0, 0, 0],
  [-0.0227712343, 1, 0, 0, 0],
  [0.000806470249, 2, 0, 0, 0],
  [-0.000154271372, 3, 0, 0, 0],
  [-3.24651735e-06, 4, 0, 0, 0],
  [7.32602852e-08, 5, 0, 0, 0],
  [1.35959073e-09, 6, 0, 0, 0],
  [-2.2583652, 0, 1, 0, 0],
  [0.0880326035, 1, 1, 0, 0],
  [0.00216844454, 2, 1, 0, 0],
  [-1.53347087e-05, 3, 1, 0, 0],
  [-5.72983704e-07, 4, 1, 0, 0],
  [-2.55090145e-09, 5, 1, 0, 0],
  [-0.751269505, 0, 2, 0, 0],
  [-0.00408350271, 1, 2, 0, 0],
  [-5.21670675e-05, 2, 2, 0, 0],
  [1.94544667e-06, 3, 2, 0, 0],
  [1.14099531e-08, 4, 2, 0, 0],
  [0.158137256, 0, 3, 0, 0],
  [-6.57263143e-05, 1, 3, 0, 0],
  [2.22697524e-07, 2, 3, 0, 0],
  [-4.16117031e-08, 3, 3, 0, 0],
  [-0.0127762753, 0, 4, 0, 0],
  [9.66891875e-06, 1, 4, 0, 0],
  [2.52785852e-09, 2, 4, 0, 0],
  [0.000456306672, 0, 5, 0, 0],
  [-1.74202546e-07, 1, 5, 0, 0],
  [-5.91491269e-06, 0, 6, 0, 0],
  [0.398374029, 0, 0, 1, 0],
  [0.000183945314, 1, 0, 1, 0],
  [-0.00017375451, 2, 0, 1, 0],
  [-7.60781159e-07, 3, 0, 1, 0],
  [3.77830287e-08, 4, 0, 1, 0],
  [5.43079673e-10, 5, 0, 1, 0],
  [-0.0200518269, 0, 1, 1, 0],
  [0.000892859837, 1, 1, 1, 0],
  [3.45433048e-06, 2, 1, 1, 0],
  [-3.77925774e-07, 3, 1, 1, 0],
  [-1.69699377e-09, 4, 1, 1, 0],
  [0.000169992415, 0, 2, 1, 0],
  [-4.99204314e-05, 1, 2, 1, 0],
  [2.47417178e-07, 2, 2, 1, 0],
  [1.07596466e-08, 3, 2, 1, 0],
  [8.49242932e-05, 0, 3, 1, 0],
  [1.35191328e-06, 1, 3, 1, 0],
  [-6.21531254e-09, 2, 3, 1, 0],
  [-4.99410301e-06, 0, 4, 1, 0],
  [-1.89489258e-08, 1, 4, 1, 0],
  [8.15300114e-08, 0, 5, 1, 0],
  [0.00075504309, 0, 0, 2, 0],
  [-5.65095215e-05, 1, 0, 2, 0],
  [-4.52166564e-07, 2, 0, 2, 0],
  [2.46688878e-08, 3, 0, 2, 0],
  [2.42674348e-10, 4, 0, 2, 0],
  [0.00015454725, 0, 1, 2, 0],
  [5.2411097e-06, 1, 1, 2, 0],
  [-8.75874982e-08, 2, 1, 2, 0],
  [-1.50743064e-09, 3, 1, 2, 0],
  [-1.56236307e-05, 0, 2, 2, 0],
  [-1.33895614e-07, 1, 2, 2, 0],
  [2.49709824e-09, 2, 2, 2, 0],
  [6.51711721e-07, 0, 3, 2, 0],
  [1.94960053e-09, 1, 3, 2, 0],
  [-1.00361113e-08, 0, 4, 2, 0],
  [-1.21206673e-05, 0, 0, 3, 0],
  [-2.1820366e-07, 1, 0, 3, 0],
  [7.51269482e-09, 2, 0, 3, 0],
  [9.79063848e-11, 3, 0, 3, 0],
  [1.25006734e-06, 0, 1, 3, 0],
  [-1.81584736e-09, 1, 1, 3, 0],
  [-3.52197671e-10, 2, 1, 3, 0],
  [-3.3651463e-08, 0, 2, 3, 0],
  [1.35908359e-10, 1, 2, 3, 0],
  [4.1703262e-10, 0, 3, 3, 0],
  [-1.30369025e-09, 0, 0, 4, 0],
  [4.13908461e-10, 1, 0, 4, 0],
  [9.22652254e-12, 2, 0, 4, 0],
  [-5.08220384e-09, 0, 1, 4, 0],
  [-2.24730961e-11, 1, 1, 4, 0],
  [1.17139133e-10, 0, 2, 4, 0],
  [6.62154879e-10, 0, 0, 5, 0],
  [4.0386326e-13, 1, 0, 5, 0],
  [1.95087203e-12, 0, 1, 5, 0],
  [-4.73602469e-12, 0, 0, 6, 0],
  [5.12733497, 0, 0, 0, 1],
  [-0.312788561, 1, 0, 0, 1],
  [-0.0196701861, 2, 0, 0, 1],
  [0.00099969087, 3, 0, 0, 1],
  [9.51738512e-06, 4, 0, 0, 1],
  [-4.66426341e-07, 5, 0, 0, 1],
  [0.548050612, 0, 1, 0, 1],
  [-0.00330552823, 1, 1, 0, 1],
  [-0.0016411944, 2, 1, 0, 1],
  [-5.16670694e-06, 3, 1, 0, 1],
  [9.52692432e-07, 4, 1, 0, 1],
  [-0.0429223622, 0, 2, 0, 1],
  [0.00500845667, 1, 2, 0, 1],
  [1.00601257e-06, 2, 2, 0, 1],
  [-1.81748644e-06, 3, 2, 0, 1],
  [-0.00125813502, 0, 3, 0, 1],
  [-0.000179330391, 1, 3, 0, 1],
  [2.34994441e-06, 2, 3, 0, 1],
  [0.000129735808, 0, 4, 0, 1],
  [1.2906487e-06, 1, 4, 0, 1],
  [-2.28558686e-06, 0, 5, 0, 1],
  [-0.0369476348, 0, 0, 1, 1],
  [0.00162325322, 1, 0, 1, 1],
  [-3.1427968e-05, 2, 0, 1, 1],
  [2.59835559e-06, 3, 0, 1, 1],
  [-4.77136523e-08, 4, 0, 1, 1],
  [0.0086420339, 0, 1, 1, 1],
  [-0.000687405181, 1, 1, 1, 1],
  [-9.13863872e-06, 2, 1, 1, 1],
  [5.15916806e-07, 3, 1, 1, 1],
  [-3.59217476e-05, 0, 2, 1, 1],
  [3.28696511e-05, 1, 2, 1, 1],
  [-7.10542454e-07, 2, 2, 1, 1],
  [-1.243823e-05, 0, 3, 1, 1],
  [-7.385844e-09, 1, 3, 1, 1],
  [2.20609296e-07, 0, 4, 1, 1],
  [-0.00073246918, 0, 0, 2, 1],
  [-1.87381964e-05, 1, 0, 2, 1],
  [4.80925239e-06, 2, 0, 2, 1],
  [-8.7549204e-08, 3, 0, 2, 1],
  [2.7786293e-05, 0, 1, 2, 1],
  [-5.06004592e-06, 1, 1, 2, 1],
  [1.14325367e-07, 2, 1, 2, 1],
  [2.53016723e-06, 0, 2, 2, 1],
  [-1.72857035e-08, 1, 2, 2, 1],
  [-3.95079398e-08, 0, 3, 2, 1],
  [-3.59413173e-07, 0, 0, 3, 1],
  [7.04388046e-07, 1, 0, 3, 1],
  [-1.89309167e-08, 2, 0, 3, 1],
  [-4.79768731e-07, 0, 1, 3, 1],
  [7.96079978e-09, 1, 1, 3, 1],
  [1.62897058e-09, 0, 2, 3, 1],
  [3.94367674e-08, 0, 0, 4, 1],
  [-1.18566247e-09, 1, 0, 4, 1],
  [3.34678041e-10, 0, 1, 4, 1],
  [-1.15606447e-10, 0, 0, 5, 1],
  [-2.80626406, 0, 0, 0, 2],
  [0.548712484, 1, 0, 0, 2],
  [-0.0039942841, 2, 0, 0, 2],
  [-0.000954009191, 3, 0, 0, 2],
  [1.93090978e-05, 4, 0, 0, 2],
  [-0.308806365, 0, 1, 0, 2],
  [0.0116952364, 1, 1, 0, 2],
  [0.000495271903, 2, 1, 0, 2],
  [-1.90710882e-05, 3, 1, 0, 2],
  [0.00210787756, 0, 2, 0, 2],
  [-0.000698445738, 1, 2, 0, 2],
  [2.30109073e-05, 2, 2, 0, 2],
  [0.00041785659, 0, 3, 0, 2],
  [-1.27043871e-05, 1, 3, 0, 2],
  [-3.04620472e-06, 0, 4, 0, 2],
  [0.0514507424, 0, 0, 1, 2],
  [-0.00432510997, 1, 0, 1, 2],
  [8.99281156e-05, 2, 0, 1, 2],
  [-7.14663943e-07, 3, 0, 1, 2],
  [-0.000266016305, 0, 1, 1, 2],
  [0.000263789586, 1, 1, 1, 2],
  [-7.01199003e-06, 2, 1, 1, 2],
  [-0.000106823306, 0, 2, 1, 2],
  [3.61341136e-06, 1, 2, 1, 2],
  [2.29748967e-07, 0, 3, 1, 2],
  [0.000304788893, 0, 0, 2, 2],
  [-6.42070836e-05, 1, 0, 2, 2],
  [1.16257971e-06, 2, 0, 2, 2],
  [7.68023384e-06, 0, 1, 2, 2],
  [-5.47446896e-07, 1, 1, 2, 2],
  [-3.5993791e-08, 0, 2, 2, 2],
  [-4.36497725e-06, 0, 0, 3, 2],
  [1.68737969e-07, 1, 0, 3, 2],
  [2.67489271e-08, 0, 1, 3, 2],
  [3.23926897e-09, 0, 0, 4, 2],
  [-0.0353874123, 0, 0, 0, 3],
  [-0.22120119, 1, 0, 0, 3],
  [0.0155126038, 2, 0, 0, 3],
  [-0.000263917279, 3, 0, 0, 3],
  [0.0453433455, 0, 1, 0, 3],
  [-0.00432943862, 1, 1, 0, 3],
  [0.000145389826, 2, 1, 0, 3],
  [0.00021750861, 0, 2, 0, 3],
  [-6.66724702e-05, 1, 2, 0, 3],
  [3.3321714e-05, 0, 3, 0, 3],
  [-0.00226921615, 0, 0, 1, 3],
  [0.000380261982, 1, 0, 1, 3],
  [-5.45314314e-09, 2, 0, 1, 3],
  [-0.000796355448, 0, 1, 1, 3],
  [2.53458034e-05, 1, 1, 1, 3],
  [-6.31223658e-06, 0, 2, 1, 3],
  [0.000302122035, 0, 0, 2, 3],
  [-4.77403547e-06, 1, 0, 2, 3],
  [1.73825715e-06, 0, 1, 2, 3],
  [-4.09087898e-07, 0, 0, 3, 3],
  [0.614155345, 0, 0, 0, 4],
  [-0.0616755931, 1, 0, 0, 4],
  [0.00133374846, 2, 0, 0, 4],
  [0.00355375387, 0, 1, 0, 4],
  [-0.000513027851, 1, 1, 0, 4],
  [0.000102449757, 0, 2, 0, 4],
  [-0.00148526421, 0, 0, 1, 4],
  [-4.11469183e-05, 1, 0, 1, 4],
  [-6.80434415e-06, 0, 1, 1, 4],
  [-9.77675906e-06, 0, 0, 2, 4],
  [0.0882773108, 0, 0, 0, 5],
  [-0.00301859306, 1, 0, 0, 5],
  [0.00104452989, 0, 1, 0, 5],
  [0.000247090539, 0, 0, 1, 5],
  [0.00148348065, 0, 0, 0, 6],
];

// Flat copies and one shared power table keep 384 hours well inside the phone budget.
const N = TERMS.length;
const COEF = new Float64Array(N);
const IDX = new Uint8Array(N * 4);
TERMS.forEach(([c, i, j, k, l], n) => {
  COEF[n] = c;
  IDX.set([i, 7 + j, 14 + k, 21 + l], n * 4);
});
const POW = new Float64Array(28);

function fillPowers(offset: number, x: number): void {
  POW[offset] = 1;
  for (let i = 1; i < 7; i++) POW[offset + i] = POW[offset + i - 1] * x;
}

/**
 * The raw polynomial, no range checks. `pa` in kPa, `va` at 10 m. Exported so
 * the fixture's extrapolated rows can check the coefficients outside the range.
 */
export function utciPolynomial(ta: number, dTmrt: number, va: number, pa: number): number {
  fillPowers(0, ta);
  fillPowers(7, va);
  fillPowers(14, dTmrt);
  fillPowers(21, pa);
  let sum = ta;
  for (let n = 0, q = 0; n < N; n++, q += 4) {
    sum += COEF[n] * POW[IDX[q]] * POW[IDX[q + 1]] * POW[IDX[q + 2]] * POW[IDX[q + 3]];
  }
  return sum;
}

const clamp = (x: number, [lo, hi]: readonly [number, number]): number => Math.min(hi, Math.max(lo, x));

// Lower bound of each category; a value equal to the bound belongs to the colder bin.
const CATEGORY_FLOORS: readonly (readonly [number, UtciCategory])[] = [
  [46, 'extreme-heat'],
  [38, 'very-strong-heat'],
  [32, 'strong-heat'],
  [26, 'moderate-heat'],
  [9, 'none'],
  [0, 'slight-cold'],
  [-13, 'moderate-cold'],
  [-27, 'strong-cold'],
  [-40, 'very-strong-cold'],
];

export const utciCategory: UtciCategoryFn = (value) => {
  for (const [floor, category] of CATEGORY_FLOORS) if (value > floor) return category;
  return 'extreme-cold';
};

/**
 * UTCI for air temperature `ta`, mean radiant temperature `tr`, wind at 10 m
 * `va10` and relative humidity `rh`. Wind, Tmrt − ta, ta and rh are clamped
 * into the fitted range and flagged. When the vapour pressure exceeds 5 kPa
 * the result has `utci: NaN`, `outOfRange: true` and `category: 'extreme-heat'`,
 * so a caller cannot show an invented number by accident.
 */
export const utci: UtciFn = (ta, tr, va10, rh) => {
  const t = clamp(ta, UTCI_TA_RANGE);
  const d = clamp(tr - ta, UTCI_DTMRT_RANGE);
  const v = clamp(va10, UTCI_WIND_RANGE);
  const h = clamp(rh, [0, 100]);
  const clamped = t !== ta || d !== tr - ta || v !== va10 || h !== rh;
  const pa = (saturationVapourPressure(t) * h) / 100 / 10;
  if (!(pa <= UTCI_PA_MAX)) return { utci: NaN, category: 'extreme-heat', clamped, outOfRange: true };
  const value = utciPolynomial(t, d, v, pa);
  return { utci: value, category: utciCategory(value), clamped, outOfRange: false };
};
