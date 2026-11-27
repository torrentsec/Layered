// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { BANDS } from './bands';
import { category, ownership, THICKNESSES, type CategoryId, type Inventory, type Level, type Thickness, type WaterResistance } from './inventory';
import { garmentKey, LAYERS_KEY, type GarmentWarmth } from './garment-learning';
import type { Requirements } from './requirements';
import type { Extra, LayerAdvice, LayerKind } from './types';

/**
 * Stage 3 of the engine: turn requirements into garments the user has said
 * they own. Unknown categories fall back to generic advice; categories the
 * user doesn't own are never suggested.
 */
export interface Match {
  layers: LayerAdvice[];
  limitations: string[];
  alternatives: LayerAdvice[][];
}

export const POINTS: Record<Thickness, number> = { thin: 1, medium: 2, thick: 3 };

/** Points a garment actually gives: its thickness plus what feedback has taught about it (US-039). */
export const effectivePoints = (id: CategoryId, t: Thickness, learned: GarmentWarmth = {}): number => POINTS[t] + (learned[garmentKey(id, t)] ?? 0);

/** Missing the insulation target costs more than going over it: cold is worse than warm. */
export const COST = {
  shortfall: 3,
  overshoot: 2,
  /** Allowed overshoot before it counts as too warm. */
  tolerance: 1,
  /** Per point over the target inside the tolerance, so an exact match wins. */
  slack: 0.25,
  /** Per point a single layer is off its planned thickness. */
  thickness: 0.5,
  /** An alternative has to be about as good as the first choice. */
  alternativeMargin: 1.5,
  /** Shortfall (points) at which the user is told their clothes aren't warm enough. */
  shortfallLimitation: 2,
} as const;

/** Penalty for poorer water resistance when the day calls for a waterproof. */
export const WATER_COST: Record<WaterResistance, number> = { waterproof: 0, resistant: 1, none: 2 };
const WIND_COST: Record<Level, number> = { high: 0, medium: 0.3, low: 0.6 };

type Prefs = Partial<Record<CategoryId, number>>;

// Lower is a better fit for the slot; a category that's missing is unsuitable.
function basePrefs(band: Requirements['band']): Prefs {
  if (band === 'tshirt' || band === 'light') return { tshirt: 0, longsleeve: 0.5 };
  if (band === 'bundle') return { thermal: 0, longsleeve: 0.5, tshirt: 1 };
  return { longsleeve: 0, thermal: 0.3, tshirt: 0.5 };
}
const MID_PREFS: Prefs = { jumper: 0, fleece: 0.1, hoodie: 0.2, cardigan: 0.3 };
const OUTER_PREFS: Record<Thickness, Prefs> = {
  thin: { 'light-jacket': 0, 'waterproof-jacket': 0.2, 'insulated-jacket': 0.4, coat: 0.6 },
  medium: { coat: 0, 'insulated-jacket': 0.1, 'waterproof-jacket': 0.3, 'light-jacket': 0.5 },
  thick: { coat: 0, 'insulated-jacket': 0, 'waterproof-jacket': 0.3, 'light-jacket': 0.8 },
};
const BOTTOM_PREFS: Record<Requirements['bottoms'], Prefs> = {
  shorts: { shorts: 0, 'light-trousers': 0.5, jeans: 1.5 },
  light: { 'light-trousers': 0, jeans: 0.5, shorts: 1 },
  standard: { jeans: 0, 'light-trousers': 0.3, 'heavy-trousers': 0.6 },
  heavy: { 'heavy-trousers': 0, jeans: 0.5, 'light-trousers': 1.2 },
};
const FOOT_PREFS: Record<Requirements['footwear'], Prefs> = {
  open: { sandals: 0, trainers: 0.3, 'waterproof-shoes': 1, boots: 1.5 },
  any: { trainers: 0, sandals: 0.3, 'waterproof-shoes': 0.5, boots: 0.8 },
  closed: { trainers: 0, 'waterproof-shoes': 0.2, boots: 0.4 },
  waterproof: { 'waterproof-shoes': 0, boots: 0.1, trainers: 0.3 },
  boots: { boots: 0, 'waterproof-shoes': 0.5, trainers: 1.5 },
};

const byPref = (p: Prefs) => (Object.entries(p) as [CategoryId, number][]).sort((a, b) => a[1] - b[1]).map(([id]) => id);

/** Categories that can fill each slot today, best fit first. Slots the day doesn't need are left out. */
export function slotCategories(r: Requirements): Partial<Record<LayerKind | 'footwear', CategoryId[]>> {
  return {
    base: byPref(basePrefs(r.band)),
    ...(r.layers.mid && !r.layers.midOptional ? { mid: byPref(MID_PREFS) } : {}),
    ...(r.layers.outer ? { outer: byPref(OUTER_PREFS[r.layers.outer]) } : {}),
    footwear: byPref(FOOT_PREFS[r.footwear]),
  };
}

const LABELS: Partial<Record<CategoryId, Record<Thickness, string>>> = {
  tshirt: { thin: 'Light T-shirt', medium: 'T-shirt', thick: 'Heavy T-shirt' },
  longsleeve: { thin: 'Thin long-sleeve top', medium: 'Long-sleeve top', thick: 'Thick long-sleeve top' },
  thermal: { thin: 'Light thermal top', medium: 'Thermal top', thick: 'Heavy thermal top' },
  jumper: { thin: 'Light jumper', medium: 'Jumper', thick: 'Thick jumper' },
  cardigan: { thin: 'Fine cardigan', medium: 'Cardigan', thick: 'Chunky cardigan' },
  hoodie: { thin: 'Light hoodie', medium: 'Hoodie', thick: 'Heavy hoodie' },
  fleece: { thin: 'Microfleece', medium: 'Fleece', thick: 'Thick fleece' },
  'light-jacket': { thin: 'Light jacket', medium: 'Jacket', thick: 'Lined jacket' },
  'insulated-jacket': { thin: 'Thin padded jacket', medium: 'Padded jacket', thick: 'Heavy padded jacket' },
  coat: { thin: 'Light coat', medium: 'Coat', thick: 'Heavy coat' },
  'waterproof-jacket': { thin: 'Waterproof shell', medium: 'Waterproof jacket', thick: 'Insulated waterproof' },
};
/** Display name for a garment, as the advice would show it. */
export function garmentLabel(id: CategoryId, t?: Thickness): string {
  return (t && LABELS[id]?.[t]) ?? PLAIN_LABEL[id] ?? category(id).name;
}

const PLAIN_LABEL: Partial<Record<CategoryId, string>> = {
  shorts: 'Shorts',
  'light-trousers': 'Light trousers',
  jeans: 'Jeans',
  'heavy-trousers': 'Heavy trousers',
  trainers: 'Trainers',
  boots: 'Boots',
  'waterproof-shoes': 'Waterproof shoes',
  sandals: 'Sandals',
};

const GENERIC_BOTTOMS: Record<Requirements['bottoms'], string> = { shorts: 'Shorts', light: 'Light trousers', standard: 'Trousers', heavy: 'Warm trousers' };
const GENERIC_FOOTWEAR: Record<Requirements['footwear'], string> = {
  open: 'Sandals or trainers',
  any: 'Shoes',
  closed: 'Closed shoes',
  waterproof: 'Waterproof shoes',
  boots: 'Boots',
};

export const LIMITATION = {
  base: 'No suitable base layer recorded in your wardrobe',
  mid: 'No jumpers, fleeces or similar recorded in your wardrobe',
  outer: 'No suitable coat or jacket recorded in your wardrobe',
  waterproof: 'No waterproof outer layer recorded in your wardrobe',
  bottoms: 'No suitable trousers or shorts recorded in your wardrobe',
  footwear: 'No suitable shoes recorded in your wardrobe',
  waterproofFeet: 'No waterproof shoes or boots recorded in your wardrobe',
  shortfall: 'Your warmest clothes fall short of what today needs, so add what you can',
} as const;

interface Option {
  category?: CategoryId;
  thickness?: Thickness;
  points: number;
  cost: number;
  water: WaterResistance;
}

interface Slot {
  kind: LayerKind;
  generic: LayerAdvice;
  planned: Thickness;
  optional: boolean;
  /** Owned options; empty means generic advice. */
  options: Option[];
  status: 'owned' | 'unknown' | 'none';
}

const water = (inv: Inventory, id: CategoryId): WaterResistance => inv[id]?.water ?? category(id).defaults.water;
const wind = (inv: Inventory, id: CategoryId): Level => inv[id]?.wind ?? category(id).defaults.wind;
const wet = (r: Requirements) => r.rain === 'waterproof' || r.rain === 'hood';

/** Whether anything at all has been recorded for these categories. */
const anyKnown = (inv: Inventory, ids: CategoryId[]) => ids.some((id) => ownership(inv, id) !== 'unknown');

/** 'owned' if something fits, else 'unknown' if a fitting category isn't set, else 'none'. */
function statusOf(inv: Inventory, prefs: Prefs, options: unknown[]): Slot['status'] {
  if (options.length) return 'owned';
  return (Object.keys(prefs) as CategoryId[]).some((id) => ownership(inv, id) === 'unknown') ? 'unknown' : 'none';
}

function upperOptions(inv: Inventory, prefs: Prefs, planned: Thickness, r: Requirements, kind: LayerKind, learned: GarmentWarmth): Option[] {
  const out: Option[] = [];
  for (const [id, pref] of Object.entries(prefs) as [CategoryId, number][]) {
    for (const t of THICKNESSES) {
      if (ownership(inv, id, t) !== 'owned') continue;
      const points = effectivePoints(id, t, learned);
      let cost = pref + Math.abs(points - POINTS[planned]) * COST.thickness;
      if (kind === 'outer') {
        if (wet(r)) cost += WATER_COST[water(inv, id)];
        if (r.wind !== 'none') cost += WIND_COST[wind(inv, id)] * (r.wind === 'high' ? 2 : 1);
      }
      out.push({ category: id, thickness: t, points, cost, water: water(inv, id) });
    }
  }
  return out;
}

function upperSlots(r: Requirements, inv: Inventory, learned: GarmentWarmth): Slot[] {
  const generic = (BANDS.find((b) => b.id === r.band) ?? BANDS[BANDS.length - 1]).layers;
  const genericFor = (kind: LayerKind, fallback: string): LayerAdvice => generic.find((l) => l.kind === kind) ?? { kind, label: fallback };
  const plan: [LayerKind, Thickness | null, Prefs, boolean, string][] = [
    ['base', r.layers.base, basePrefs(r.band), false, 'Base layer'],
    ['mid', r.layers.mid, MID_PREFS, r.layers.midOptional, 'Jumper'],
    ['outer', r.layers.outer, r.layers.outer ? OUTER_PREFS[r.layers.outer] : {}, false, 'Jacket'],
  ];
  const slots: Slot[] = [];
  for (const [kind, planned, prefs, optional, fallback] of plan) {
    if (!planned) continue;
    const options = upperOptions(inv, prefs, planned, r, kind, learned);
    const status = statusOf(inv, prefs, options);
    // A light layer you don't own isn't worth mentioning.
    if (optional && status === 'none') continue;
    slots.push({ kind, generic: genericFor(kind, fallback), planned, optional, options, status });
  }
  return slots;
}

function layerFor(inv: Inventory, slot: Slot, o: Option | undefined): LayerAdvice {
  if (!o?.category) {
    return { ...slot.generic, thickness: slot.planned, owned: slot.status === 'none' ? 'none' : 'unknown' };
  }
  const label = garmentLabel(o.category, o.thickness);
  const nickname = slot.kind === 'outer' ? inv[o.category]?.nickname?.trim() : undefined;
  return {
    kind: slot.kind,
    label,
    ...(slot.optional ? { optional: true } : {}),
    category: o.category,
    thickness: o.thickness,
    ...(nickname ? { nickname } : {}),
    owned: 'owned',
  };
}

interface Combo {
  picks: (Option | undefined)[];
  cost: number;
  shortfall: number;
  insulationCost: number;
  waterRank: number;
}

function combos(slots: Slot[], target: number): Combo[] {
  const choices = slots.map((s) => (s.options.length ? s.options : [undefined]));
  const out: Combo[] = [];
  const walk = (i: number, picks: (Option | undefined)[]) => {
    if (i === choices.length) {
      let total = 0;
      let cost = 0;
      let waterRank = 0;
      slots.forEach((s, j) => {
        const p = picks[j];
        if (!s.optional) total += p ? p.points : POINTS[s.planned];
        if (p) cost += p.cost;
        if (s.kind === 'outer' && p) waterRank = WATER_COST[p.water];
      });
      const shortfall = Math.max(0, target - total);
      const over = Math.max(0, total - target);
      const insulationCost =
        shortfall * COST.shortfall + Math.max(0, over - COST.tolerance) * COST.overshoot + Math.min(over, COST.tolerance) * COST.slack;
      out.push({ picks, cost: cost + insulationCost, shortfall, insulationCost, waterRank });
      return;
    }
    for (const c of choices[i]) walk(i + 1, [...picks, c]);
  };
  walk(0, []);
  return out.sort((a, b) => a.cost - b.cost);
}

function lowerLayer(
  inv: Inventory,
  kind: 'bottoms' | 'footwear',
  prefs: Prefs,
  genericLabel: string,
  r: Requirements,
): { layer?: LayerAdvice; status: Slot['status'] } {
  const group = (Object.keys(PLAIN_LABEL) as CategoryId[]).filter((id) => category(id).group === kind);
  // Nothing set for the whole group: say nothing rather than guess.
  if (!anyKnown(inv, group)) return { status: 'unknown' };
  let best: { id: CategoryId; cost: number } | undefined;
  for (const [id, pref] of Object.entries(prefs) as [CategoryId, number][]) {
    if (ownership(inv, id) !== 'owned') continue;
    // Snow wants boots first; dry feet still count, but less than ankle cover.
    const weight = kind !== 'footwear' ? 0 : r.footwear === 'waterproof' ? 1 : r.footwear === 'boots' ? 0.3 : 0;
    const cost = pref + WATER_COST[water(inv, id)] * weight;
    if (!best || cost < best.cost) best = { id, cost };
  }
  if (best) return { layer: { kind, label: PLAIN_LABEL[best.id]!, category: best.id, owned: 'owned' }, status: 'owned' };
  const status = statusOf(inv, prefs, []);
  return { layer: { kind, label: genericLabel, owned: status === 'none' ? 'none' : 'unknown' }, status };
}

/** A waterproof to wear over a band that otherwise has no outer layer. */
function shellFor(inv: Inventory): LayerAdvice | undefined {
  let best: { id: CategoryId; t: Thickness; cost: number } | undefined;
  for (const id of Object.keys(OUTER_PREFS.thin) as CategoryId[]) {
    const w = water(inv, id);
    if (w === 'none') continue;
    for (const t of THICKNESSES) {
      if (ownership(inv, id, t) !== 'owned') continue;
      const cost = WATER_COST[w] * 10 + POINTS[t];
      if (!best || cost < best.cost) best = { id, t, cost };
    }
  }
  if (!best) return undefined;
  const nickname = inv[best.id]?.nickname?.trim();
  return { kind: 'outer', label: 'Waterproof', category: best.id, thickness: best.t, ...(nickname ? { nickname } : {}), owned: 'owned' };
}

const OUTER_IDS = Object.keys(OUTER_PREFS.thin) as CategoryId[];
const sameLayer = (a?: Option, b?: Option) => a?.category === b?.category && a?.thickness === b?.thickness;

/** `learned` is the persisted garment warmth; its `layers` entry trims the insulation target. */
export function matchInventory(r: Requirements, inv: Inventory = {}, learned: GarmentWarmth = {}): Match {
  const limitations: string[] = [];
  const slots = upperSlots(r, inv, learned);
  const ranked = combos(slots, r.insulation + (learned[LAYERS_KEY] ?? 0));
  const best = ranked[0];
  const upper = slots.map((s, i) => layerFor(inv, s, best.picks[i]));

  for (const s of slots) if (s.status === 'none' && !s.optional) limitations.push(LIMITATION[s.kind]);
  if (best.shortfall >= COST.shortfallLimitation) limitations.push(LIMITATION.shortfall);

  const extra: LayerAdvice[] = [];
  if (wet(r)) {
    const outerPick = best.picks[slots.findIndex((s) => s.kind === 'outer')];
    const hasOuterSlot = slots.some((s) => s.kind === 'outer');
    const shell = shellFor(inv);
    if (!hasOuterSlot && shell) extra.push(shell);
    const covered = outerPick ? outerPick.water !== 'none' : !!shell;
    if (!covered && !shell && anyKnown(inv, OUTER_IDS)) limitations.push(LIMITATION.waterproof);
  }

  const lower: LayerAdvice[] = [];
  const bottoms = lowerLayer(inv, 'bottoms', BOTTOM_PREFS[r.bottoms], GENERIC_BOTTOMS[r.bottoms], r);
  if (bottoms.layer) lower.push(bottoms.layer);
  if (bottoms.status === 'none') limitations.push(LIMITATION.bottoms);
  const feet = lowerLayer(inv, 'footwear', FOOT_PREFS[r.footwear], GENERIC_FOOTWEAR[r.footwear], r);
  if (feet.layer) lower.push(feet.layer);
  if (feet.status === 'none') limitations.push(LIMITATION.footwear);
  if (feet.layer?.category && (r.footwear === 'waterproof' || r.footwear === 'boots') && water(inv, feet.layer.category) === 'none') {
    limitations.push(LIMITATION.waterproofFeet);
  }

  const alternatives: LayerAdvice[][] = [];
  const allOwned = slots.every((s) => s.options.length);
  if (allOwned) {
    const alt = ranked.find(
      (c) =>
        c !== best &&
        c.picks.some((p, i) => !sameLayer(p, best.picks[i])) &&
        c.insulationCost <= best.insulationCost &&
        c.waterRank <= best.waterRank &&
        c.cost <= best.cost + COST.alternativeMargin,
    );
    if (alt) alternatives.push([...slots.map((s, i) => layerFor(inv, s, alt.picks[i])), ...extra, ...lower]);
  }

  return { layers: [...upper, ...extra, ...lower], limitations, alternatives };
}

/**
 * Drops extras the suggested clothes already provide, so a chip doesn't
 * repeat the list. Hoods aren't recorded, so a hooded-waterproof chip still
 * says something the list doesn't and stays.
 */
export function withoutCovered(extras: Extra[], layers: LayerAdvice[], inv: Inventory = {}): Extra[] {
  const waterproof = layers.some((l) => l.kind === 'outer' && l.category && water(inv, l.category) === 'waterproof');
  return waterproof ? extras.filter((e) => e.id !== 'waterproof') : extras;
}
