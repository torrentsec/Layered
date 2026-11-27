// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { BANDS } from './bands';
import type { ComfortProfile } from './comfort';
import { RAIN, SWING_DEGREES, type WindowStats } from './extras';
import type { Level, Thickness } from './inventory';
import type { Activity, BandId, Extra, ExtraId } from './types';

/**
 * Stage 2 of the engine: what the day demands, independent of what anyone
 * owns. Stage 3 (matching) turns this into garments from the inventory.
 */
export interface Requirements {
  effective: number;
  band: BandId;
  /**
   * Upper-body insulation needed, in warmth points. Thin = 1, medium = 2 and
   * thick = 3 per layer, and outerwear counts the same way, so a T-shirt day
   * is 1 and a thermal + thick jumper + heavy coat day is about 9.
   */
  insulation: number;
  layers: {
    base: Thickness;
    mid: Thickness | null;
    midOptional: boolean;
    outer: Thickness | null;
  };
  rain: 'none' | 'umbrella' | 'waterproof' | 'hood';
  /**
   * How wind-resistant the outermost layer should be. Kept apart from
   * insulation: feels-like already includes wind chill, so wind never adds
   * warmth points, it only asks for a fabric that stops it.
   */
  wind: Level | 'none';
  bottoms: 'shorts' | 'light' | 'standard' | 'heavy';
  footwear: 'open' | 'any' | 'closed' | 'waterproof' | 'boots';
  /** Conditions change enough in the window that layers should come off easily. */
  removable: boolean;
  /** Why `removable` is set, when it is. */
  removableWhy?: 'warming' | 'edge';
  accessories: ExtraId[];
}

type LayerPlan = Requirements['layers'];

const LAYERS: Record<BandId, LayerPlan> = {
  tshirt: { base: 'thin', mid: null, midOptional: false, outer: null },
  light: { base: 'medium', mid: 'thin', midOptional: true, outer: null },
  two: { base: 'medium', mid: 'medium', midOptional: false, outer: null },
  jacket: { base: 'medium', mid: 'medium', midOptional: false, outer: 'thin' },
  coat: { base: 'medium', mid: 'medium', midOptional: false, outer: 'medium' },
  bundle: { base: 'thick', mid: 'thick', midOptional: false, outer: 'thick' },
};

const POINTS: Record<Thickness, number> = { thin: 1, medium: 2, thick: 3 };

export function insulationPoints(l: LayerPlan): number {
  return POINTS[l.base] + (l.mid && !l.midOptional ? POINTS[l.mid] : 0) + (l.outer ? POINTS[l.outer] : 0);
}

/** The layer plan for a band. Matching may meet the same points with a different mix. */
export function layerPlan(band: BandId): LayerPlan {
  return LAYERS[band];
}

/**
 * Warmth points needed at or above each effective temperature, warmest first.
 * Band edges carry the points of that band's layer plan, so the plan derived
 * from a target always matches the band. The extra steps inside the two and
 * bundle bands exist because their plans leave room: a mild 16° day needs
 * less than a 12° one, and -8° needs more than 1°, and matching should not
 * overshoot on the milder side.
 */
export const INSULATION_STEPS: readonly { min: number; points: number }[] = [
  { min: 22, points: 1 },
  { min: 17, points: 2 },
  { min: 15, points: 3 },
  { min: 12, points: 4 },
  { min: 7, points: 5 },
  { min: 2, points: 6 },
  { min: -2, points: 7 },
  { min: -6, points: 8 },
  { min: -Infinity, points: 9 },
];

/** Stage 2a: warmth points the effective temperature calls for. */
export function insulationTarget(effective: number): number {
  return (INSULATION_STEPS.find((s) => effective >= s.min) ?? INSULATION_STEPS[INSULATION_STEPS.length - 1]).points;
}

// Warmest first, so the first plan that reaches the target is the lightest that does.
const PLANS_BY_WARMTH = BANDS.map((b) => LAYERS[b.id]);

/** The lightest band plan that reaches `points`. */
export function layersForTarget(points: number): LayerPlan {
  return PLANS_BY_WARMTH.find((p) => insulationPoints(p) >= points) ?? PLANS_BY_WARMTH[PLANS_BY_WARMTH.length - 1];
}

/**
 * Wind protection tiers, in km/h. A tier applies when sustained wind or gusts
 * go strictly above its limit. Medium starts where the hat-in-wind rule does
 * and high where an umbrella stops being usable, so the requirement agrees
 * with the extras shown beside it.
 */
export const WIND_PROTECTION: Record<Level, { wind: number; gust: number }> = {
  low: { wind: 15, gust: 25 },
  medium: { wind: 25, gust: 35 },
  high: { wind: 35, gust: RAIN.umbrellaMaxGust },
};

/** km/h added to every wind limit: low tolerance asks for protection sooner. */
export const WIND_TOLERANCE_SHIFT: Record<Level, number> = { low: -5, medium: 0, high: 5 };

export function windProtection(stats: Pick<WindowStats, 'maxWind' | 'maxGust'>, tolerance: Level = 'medium'): Requirements['wind'] {
  const shift = WIND_TOLERANCE_SHIFT[tolerance];
  const over = (l: Level) => stats.maxWind > WIND_PROTECTION[l].wind + shift || stats.maxGust > WIND_PROTECTION[l].gust + shift;
  return over('high') ? 'high' : over('medium') ? 'medium' : over('low') ? 'low' : 'none';
}

/**
 * Rain thresholds for people who mind rain more or less than most. Medium
 * tolerance uses the extras rules unchanged. High tolerance shrugs off a
 * passing shower until the chance reaches `umbrellaProb`; low tolerance wants
 * a waterproof from a lower chance or amount.
 */
export const RAIN_TOLERANCE = {
  high: { umbrellaProb: 45 },
  low: { waterproofProb: 45, waterproofMm: 0.5 },
} as const;

export function rainProtection(
  extras: Pick<Extra, 'id'>[],
  stats: Pick<WindowStats, 'maxProb' | 'totalPrecip'>,
  tolerance: Level = 'medium',
): Requirements['rain'] {
  const ids = new Set(extras.map((e) => e.id));
  const fromExtras: Requirements['rain'] = ids.has('hood') ? 'hood' : ids.has('waterproof') ? 'waterproof' : ids.has('umbrella') ? 'umbrella' : 'none';
  if (fromExtras === 'none' || tolerance === 'medium') return fromExtras;
  const soaking = stats.maxProb >= RAIN.waterproofProb || stats.totalPrecip >= RAIN.waterproofMm;
  if (tolerance === 'high') return !soaking && stats.maxProb < RAIN_TOLERANCE.high.umbrellaProb ? 'none' : fromExtras;
  const wetEnough = stats.maxProb >= RAIN_TOLERANCE.low.waterproofProb || stats.totalPrecip >= RAIN_TOLERANCE.low.waterproofMm;
  return fromExtras === 'umbrella' && wetEnough ? 'waterproof' : fromExtras;
}

/** Inclusive lower bounds of the effective temperature for each kind of bottoms. */
export const BOTTOMS = { shorts: 22, light: 15, standard: 5 } as const;

export function bottomsFor(effective: number): Requirements['bottoms'] {
  return effective >= BOTTOMS.shorts ? 'shorts' : effective >= BOTTOMS.light ? 'light' : effective >= BOTTOMS.standard ? 'standard' : 'heavy';
}

/** Inclusive lower bounds for dry days: sandals from `open`, anything goes from `any`. */
export const FOOTWEAR = { open: 22, any: 15 } as const;

export function footwearFor(effective: number, rain: Requirements['rain'], snow: boolean): Requirements['footwear'] {
  if (snow) return 'boots';
  if (rain === 'waterproof' || rain === 'hood') return 'waterproof';
  if (rain !== 'none') return 'closed';
  return effective >= FOOTWEAR.open ? 'open' : effective >= FOOTWEAR.any ? 'any' : 'closed';
}

/**
 * °C either side of a band edge where the advice could go either way. A
 * reading this close is within forecast error, so layers should be easy to
 * shed or add.
 */
export const EDGE_HEDGE = 1;

const BAND_EDGES = BANDS.map((b) => b.min).filter(Number.isFinite);

export function nearBandEdge(effective: number): boolean {
  return BAND_EDGES.some((edge) => Math.abs(effective - edge) <= EDGE_HEDGE);
}

export interface RequirementsInput {
  effective: number;
  band: BandId;
  stats: WindowStats;
  extras: Extra[];
  activity: Activity;
  comfort?: ComfortProfile;
}

const ACCESSORY_IDS: ExtraId[] = ['hat', 'gloves', 'scarf', 'sunglasses', 'sunscreen', 'reflective'];

/** Stage 2: what the day demands. */
export function requirementsFor(x: RequirementsInput): Requirements {
  const insulation = insulationTarget(x.effective);
  const layers = layersForTarget(insulation);
  const ids = new Set(x.extras.map((e) => e.id));
  const rain = rainProtection(x.extras, x.stats, x.comfort?.rainTolerance);
  const warming = ids.has('swing') || x.stats.warming >= SWING_DEGREES;
  const edge = nearBandEdge(x.effective);
  return {
    effective: x.effective,
    band: x.band,
    insulation,
    layers,
    rain,
    wind: windProtection(x.stats, x.comfort?.windTolerance),
    bottoms: bottomsFor(x.effective),
    footwear: footwearFor(x.effective, rain, ids.has('boots') || x.stats.snow),
    removable: warming || edge,
    ...(warming ? { removableWhy: 'warming' as const } : edge ? { removableWhy: 'edge' as const } : {}),
    accessories: [...ids].filter((id) => ACCESSORY_IDS.includes(id)),
  };
}
