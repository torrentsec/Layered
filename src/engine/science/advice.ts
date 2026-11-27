// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

/**
 * Glue between the thermal model and the band pipeline (backlog S7c): the
 * clothing target picks the band, and the band's plan stays what matching
 * works from until matching moves to clo (thermal-model §9.1).
 */

import { RAIN, type WindowStats } from '../extras';
import { category, type Inventory } from '../inventory';
import type { Activity, BandId, Effort, LayerAdvice } from '../types';
import { ensembleClo } from './clothing';
import { metabolicRate } from './metabolic';
import { bandForClo, clothingTarget, CLO_EDGE_HEDGE, CLO_EDGE_HEDGE_WIDE, nearCloEdge } from './target';
import type { ClothingTarget, GarmentClo, UtciResult, Weather, WetState } from './types';
import { utci } from './utci';
import type { ScienceWhy } from './why';

/** What the science engine needs beyond the band pipeline's own input. */
export interface ScienceInput {
  /** One per window hour, in the same order. */
  weather: Weather[];
  /** Hours spent outside in the window. */
  exposureHours: number;
  /** Personal insulation bias, clo; positive dresses warmer. */
  bias: number;
}

export interface ScienceVerdict {
  target: ClothingTarget;
  band: BandId;
  /** The target sits within the hedge of a band edge. */
  edge: boolean;
}

// UTCI per hour is needed both for the hedge and for "Why this?".
const utciOf = (w: Weather): UtciResult => utci(w.ta, w.tmrt, w.wind10, w.rh);

export function scienceVerdict(x: ScienceInput, activity: Activity, effort?: Effort): ScienceVerdict {
  const target = clothingTarget({ hours: x.weather, activity, effort, exposureHours: x.exposureHours, bias: x.bias });
  // Less certain inputs widen the band where the advice could go either way (§9.1).
  const unsure = x.weather.some((w) => w.radiation === 'estimated' || utciOf(w).clamped);
  return { target, band: bandForClo(target.icl), edge: nearCloEdge(target.icl, unsure ? CLO_EDGE_HEDGE_WIDE : CLO_EDGE_HEDGE) };
}

/** How wet clothing gets in the window, on the same thresholds as the rain extras. */
export function wetState(stats: Pick<WindowStats, 'maxProb' | 'totalPrecip'>): WetState {
  if (stats.maxProb >= RAIN.waterproofProb || stats.totalPrecip >= RAIN.waterproofMm) return 'rain';
  return stats.maxProb >= RAIN.umbrellaProb ? 'showers' : 'dry';
}

/** ISO 9920 sum of matched layers that name a category; generic advice has nothing to sum. */
function outfitClo(layers: LayerAdvice[], inventory: Inventory, w: Weather, walk: number, wet: WetState): ScienceWhy['outfit'] {
  const worn = layers.filter((l) => l.category && !l.optional);
  if (!worn.length || worn.length < layers.filter((l) => !l.optional).length) return undefined;
  const garments: GarmentClo[] = worn.map((l) => ({ category: l.category!, thickness: l.thickness }));
  const outer = worn.find((l) => l.kind === 'outer');
  const props = outer && { d: category(outer.category!).defaults, e: inventory[outer.category!] };
  const e = ensembleClo(garments, w.wind10, walk, wet, props && { water: props.e?.water ?? props.d.water, wind: props.e?.wind ?? props.d.wind });
  return { basic: e.basic, windLoss: e.windLoss };
}

export interface ScienceWhyInput {
  hours: { time: string }[];
  science: ScienceInput;
  target: ClothingTarget;
  activity: Activity;
  effort?: Effort;
  layers: LayerAdvice[];
  inventory: Inventory;
  stats: Pick<WindowStats, 'maxProb' | 'totalPrecip'>;
  biasCount: number;
}

/** The numbers behind the advice, for "Why this?". The coldest hour is the one with the lowest UTCI. */
export function scienceWhy(x: ScienceWhyInput): ScienceWhy {
  const results = x.science.weather.map(utciOf);
  let i = 0;
  results.forEach((r, j) => {
    if (r.utci < results[i].utci) i = j;
  });
  const w = x.science.weather[i];
  const trusted = results.filter((r) => !r.outOfRange).map((r) => r.utci);
  const metabolic = metabolicRate(x.activity, x.effort);
  const outfit = outfitClo(x.layers, x.inventory, w, metabolic.walk, wetState(x.stats));
  return {
    coldestHour: x.hours[i].time,
    ta: w.ta,
    utci: results[i],
    tmrtDelta: w.tmrt - w.ta,
    radiation: w.radiation,
    feels: trusted.length ? { min: Math.min(...trusted), max: Math.max(...trusted) } : { min: results[i].utci, max: results[i].utci },
    metabolic,
    exposureMinutes: Math.round(x.science.exposureHours * 60),
    target: x.target,
    ...(outfit ? { outfit } : {}),
    biasCount: x.biasCount,
  };
}
