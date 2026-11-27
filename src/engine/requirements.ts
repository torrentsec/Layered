// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { ComfortProfile } from './comfort';
import type { WindowStats } from './extras';
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
  wind: Level | 'none';
  bottoms: 'shorts' | 'light' | 'standard' | 'heavy';
  footwear: 'open' | 'any' | 'closed' | 'waterproof' | 'boots';
  /** Conditions change enough in the window that layers should come off easily. */
  removable: boolean;
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
  const layers = layerPlan(x.band);
  const ids = new Set(x.extras.map((e) => e.id));
  const rain: Requirements['rain'] = ids.has('hood') ? 'hood' : ids.has('waterproof') ? 'waterproof' : ids.has('umbrella') ? 'umbrella' : 'none';
  const wind: Requirements['wind'] = x.stats.maxGust > 40 ? 'high' : x.stats.maxWind > 25 ? 'medium' : 'none';
  const bottoms: Requirements['bottoms'] = x.effective >= 22 ? 'shorts' : x.effective >= 15 ? 'light' : x.effective >= 5 ? 'standard' : 'heavy';
  const footwear: Requirements['footwear'] = ids.has('boots')
    ? 'boots'
    : rain === 'waterproof' || rain === 'hood'
      ? 'waterproof'
      : x.effective >= 22 && rain === 'none'
        ? 'open'
        : 'closed';
  return {
    effective: x.effective,
    band: x.band,
    insulation: insulationPoints(layers),
    layers,
    rain,
    wind,
    bottoms,
    footwear,
    removable: ids.has('swing'),
    accessories: [...ids].filter((id) => ACCESSORY_IDS.includes(id)),
  };
}
