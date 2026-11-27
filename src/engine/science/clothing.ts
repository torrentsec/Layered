// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * Garment insulation, ISO 9920 ensemble summation and the resultant (dynamic)
 * insulation after wind, walking and rain. docs/science/thermal-model.md §7.
 *
 * Sources:
 * - ISO 9920:2007 §4.3 (Icl = 0.835·ΣIclu + 0.161) and Annex A (dynamic correction).
 * - ISO 7730:2005 Table C.2 and ASHRAE 55-2023 garment values; the ASHRAE
 *   values were cross-checked against pythermalcomfort `clo_individual_garments`.
 * - Havenith, G., Nilsson, H. O. (2004). Correction of clothing insulation for
 *   movement and wind effects, a meta-analysis. Eur J Appl Physiol 92, 636–640,
 *   doi:10.1007/s00421-004-1113-6; erratum 93, 506 (2005).
 * - Wang, F. et al. (2016). Textile Research Journal 86(1), 57–63, for the
 *   range the wet-clothing factors sit in.
 * - Correction equations ported from pythermalcomfort 4.8.1
 *   (`clo_correction_factor_environment`, `clo_intrinsic_insulation_ensemble`),
 *   © 2019 Federico Tartarini, MIT licence.
 */

import { CATALOGUE, type CategoryId, type Level, type Thickness, type WaterResistance } from '../inventory';
import { windAtBody } from './radiation';
import type { EnsembleClo, EnsembleCloFn, GarmentClo, GarmentCloFn, WetState } from './types';

export interface GarmentCloRow {
  /** Basic insulation Iclu, clo; per thickness for categories that have one. */
  clo: number | Record<Thickness, number>;
  /** Judgement, not a value listed in a standard (PO decision 8 accepts these). */
  estimate: boolean | Record<Thickness, boolean>;
  source: string;
}

const t = (thin: number, medium: number, thick: number): Record<Thickness, number> => ({ thin, medium, thick });
const est = (thin: boolean, medium: boolean, thick: boolean): Record<Thickness, boolean> => ({ thin, medium, thick });

/** Briefs and ankle socks, worn under every outfit and never in the wardrobe. */
export const BASE_ALLOWANCE_CLO = 0.06; // ISO 7730 C.2: briefs 0.04 + ankle socks 0.02

export const GARMENT_CLO: Record<CategoryId, GarmentCloRow> = {
  tshirt: { clo: t(0.08, 0.09, 0.12), estimate: est(true, false, true), source: 'ISO 7730 C.2 T-shirt 0.09; thin and thick estimate' },
  longsleeve: { clo: t(0.15, 0.25, 0.3), estimate: false, source: 'ISO 7730 C.2 light/normal/flannel shirt, long sleeves' },
  thermal: { clo: t(0.12, 0.2, 0.3), estimate: est(false, false, true), source: 'ISO 7730 C.2 long-sleeve underwear 0.12; ASHRAE 55 long underwear top 0.20; thick estimate' },
  jumper: { clo: t(0.2, 0.28, 0.35), estimate: false, source: 'ISO 7730 C.2 thin sweater / sweater / thick sweater' },
  cardigan: { clo: t(0.18, 0.25, 0.32), estimate: true, source: 'estimate: sweater less about 10% for the open front' },
  hoodie: { clo: t(0.25, 0.34, 0.4), estimate: est(true, false, true), source: 'ASHRAE 55 long-sleeve sweatshirt 0.34; thin and thick estimate' },
  fleece: { clo: t(0.25, 0.35, 0.45), estimate: true, source: 'estimate: between sweater and jacket, by loft' },
  'light-jacket': { clo: t(0.25, 0.35, 0.4), estimate: est(false, false, true), source: 'ISO 7730 C.2 light summer jacket 0.25 / jacket 0.35; thick estimate' },
  'insulated-jacket': { clo: t(0.4, 0.55, 0.7), estimate: est(true, false, true), source: 'ISO 7730 C.2 down jacket 0.55; thin and thick estimate' },
  coat: { clo: t(0.45, 0.6, 0.7), estimate: est(true, false, false), source: 'ISO 7730 C.2 coat 0.60 / parka 0.70; mac estimate' },
  'waterproof-jacket': { clo: t(0.15, 0.3, 0.55), estimate: true, source: 'estimate: unlined shell / lined / insulated as down jacket' },
  // ASHRAE 55 walking shorts; ISO 7730 lists 0.06 (shorts) and 0.11 (walking shorts).
  shorts: { clo: 0.08, estimate: false, source: 'ISO 7730 C.2 shorts 0.06, walking shorts 0.11' },
  'light-trousers': { clo: 0.2, estimate: false, source: 'ISO 7730 C.2 light trousers' },
  jeans: { clo: 0.25, estimate: false, source: 'ISO 7730 C.2 normal trousers' },
  'heavy-trousers': { clo: 0.28, estimate: false, source: 'ISO 7730 C.2 flannel trousers' },
  trainers: { clo: 0.02, estimate: false, source: 'ISO 7730 C.2 shoes, thin soled' },
  boots: { clo: 0.1, estimate: false, source: 'ISO 7730 C.2 boots' },
  'waterproof-shoes': { clo: 0.04, estimate: false, source: 'ISO 7730 C.2 shoes, thick soled' },
  sandals: { clo: 0.02, estimate: false, source: 'ISO 7730 C.2 shoes, thin soled' },
  // Whole-body effect is small; these matter for ISO 11079 local cooling instead.
  hat: { clo: 0.02, estimate: true, source: 'estimate; whole-body effect is small, value is local (head) cooling' },
  scarf: { clo: 0.02, estimate: true, source: 'estimate; whole-body effect is small, value is local (neck) cooling' },
  gloves: { clo: 0.05, estimate: false, source: 'ISO 7730 C.2 gloves' },
  // Carried, not worn: it keeps clothing dry rather than adding insulation.
  umbrella: { clo: 0, estimate: false, source: 'not worn' },
};

export function isEstimate(category: CategoryId, thickness: Thickness = 'medium'): boolean {
  const e = GARMENT_CLO[category].estimate;
  return typeof e === 'boolean' ? e : e[thickness];
}

export const garmentClo: GarmentCloFn = (g: GarmentClo): number => {
  if (g.clo !== undefined && Number.isFinite(g.clo)) return Math.max(0, g.clo);
  const v = GARMENT_CLO[g.category].clo;
  return typeof v === 'number' ? v : v[g.thickness ?? 'medium'];
};

/** ISO 9920 §4.3; valid for ensembles with fairly even body coverage. */
export const iclFromGarments = (sumIclu: number): number => 0.835 * sumIclu + 0.161;

// ---- Resultant insulation (ISO 9920 Annex A, Havenith and Nilsson 2004) ----

const VAR_MIN = 0.15;
// The fitted quadratic turns upward past about 3.3 m/s; the fit's data stop at 3.5.
const VAR_MAX = 3.5;
const VW_MAX = 1.2;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

const nudeFactor = (vr: number, vw: number): number =>
  Math.exp(-0.533 * (vr - 0.15) + 0.069 * (vr - 0.15) ** 2 - 0.462 * vw + 0.201 * vw ** 2);

const clothedFactor = (vr: number, vw: number): number =>
  Math.exp(-0.281 * (vr - 0.15) + 0.044 * (vr - 0.15) ** 2 - 0.492 * vw + 0.176 * vw ** 2);

/**
 * I_T,r / I_T for relative air speed `vr` and walking speed `vw` (m/s), both
 * clamped to the fit's range. Below 0.6 clo it blends linearly towards the nude form.
 */
export function correctionFactor(icl: number, vr: number, vw: number): number {
  const v = clamp(vr, VAR_MIN, VAR_MAX);
  const w = clamp(vw, 0, VW_MAX);
  if (icl <= 0) return nudeFactor(v, w);
  if (icl > 0.6) return clothedFactor(v, w);
  return ((0.6 - icl) * nudeFactor(v, w) + icl * clothedFactor(v, w)) / 0.6;
}

/**
 * Resultant intrinsic insulation Icl,r, clo. ISO 9920 allows the same factor
 * on Icl as on I_T. The longer route, I_T,r − Ia,r / fcl, rises again above
 * about 3 m/s because the nude and clothed fits turn at different speeds, which
 * would make a gale look warmer than a breeze.
 */
export const resultantIcl = (icl: number, vr: number, vw: number): number => icl * correctionFactor(icl, vr, vw);

/**
 * Relative air speed at the body. Head- and tailwind legs of a walk average
 * to roughly the larger of wind and walking speed, and a walker in calm air
 * still meets their own breeze.
 */
const relativeAirSpeed = (wind10: number, walk: number): number => Math.max(windAtBody(wind10), Math.max(0, walk));

// ---- Wet clothing (thermal-model §7.4; judgement within the published range) ----

export const WET_FACTOR: Record<WaterResistance, Record<WetState, number>> = {
  none: { dry: 1, showers: 0.85, rain: 0.7 },
  // Sheds a shower, soaks through in steady rain: halfway to no protection.
  resistant: { dry: 1, showers: 0.95, rain: 0.85 },
  // Layers underneath stay dry; condensation under the shell still costs a little.
  waterproof: { dry: 1, showers: 0.95, rain: 0.95 },
};

// ---- Air permeability for IREQ, l/(m² s) (thermal-model §2.2, §7.3) ----

export const PERMEABILITY = { shell: 8, normal: 50, knit: 1000 } as const;

const OUTER_IDS = new Set<CategoryId>(CATALOGUE.filter((c) => c.group === 'outer').map((c) => c.id));
const KNIT_IDS = new Set<CategoryId>(['jumper', 'cardigan']);

function permeability(garments: GarmentClo[], outer?: { water: WaterResistance; wind: Level }): number {
  if (outer && (outer.wind === 'high' || outer.water === 'waterproof')) return PERMEABILITY.shell;
  const hasOuter = garments.some((g) => OUTER_IDS.has(g.category));
  if (!hasOuter && garments.some((g) => KNIT_IDS.has(g.category))) return PERMEABILITY.knit;
  return PERMEABILITY.normal;
}

/**
 * Basic and resultant insulation of an outfit. The base allowance is added
 * here, so `garments` lists only what comes from the wardrobe. `outer`
 * describes the outermost layer; without it the outfit is treated as having
 * no water or wind protection.
 */
export const ensembleClo: EnsembleCloFn = (garments, wind10, walk, wet, outer): EnsembleClo => {
  const sum = BASE_ALLOWANCE_CLO + garments.reduce((s, g) => s + garmentClo(g), 0);
  const basic = iclFromGarments(sum);
  const wetIcl = basic * WET_FACTOR[outer?.water ?? 'none'][wet];
  const resultant = resultantIcl(wetIcl, relativeAirSpeed(wind10, walk), walk);
  return {
    basic,
    resultant,
    windLoss: basic > 0 ? Math.max(0, 1 - resultant / basic) : 0,
    permeability: permeability(garments, outer),
  };
};
