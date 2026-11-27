// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { WardrobeItem } from '../engine/types';
import { category, type CategoryId, type Inventory, type InventoryEntry, type Thickness } from '../engine/inventory';
import { inventory, wardrobe } from './store';

type Rule = [RegExp, CategoryId];

// Order matters: the first match wins, so specific words go before general ones.
const BASE: Rule[] = [
  [/thermal|merino|base ?layer/i, 'thermal'],
  [/t-?shirt|\btee\b|vest|polo/i, 'tshirt'],
  [/long ?sleeve|shirt|top/i, 'longsleeve'],
];
const MID: Rule[] = [
  [/cardi/i, 'cardigan'],
  [/hood|sweat/i, 'hoodie'],
  [/fleece/i, 'fleece'],
  [/jumper|sweater|knit|pullover/i, 'jumper'],
];
const OUTER: Rule[] = [
  [/puffer|down|padded|quilt|insulat/i, 'insulated-jacket'],
  [/rain|shell|waterproof|cagoule|anorak/i, 'waterproof-jacket'],
  [/coat|parka|trench|\bmac\b|mackintosh/i, 'coat'],
  [/denim|overshirt|shacket|windbreaker|bomber|blazer|gilet|jacket/i, 'light-jacket'],
];
const ACCESSORY: Rule[] = [
  [/umbrella|brolly/i, 'umbrella'],
  [/glove|mitt/i, 'gloves'],
  [/hat|beanie|toque|\bcap\b/i, 'hat'],
  [/scarf|snood|neck/i, 'scarf'],
  [/boot/i, 'boots'],
  [/trainer|sneaker|runner/i, 'trainers'],
  [/sandal|flip/i, 'sandals'],
];

const match = (rules: Rule[], name: string): CategoryId | undefined => rules.find(([re]) => re.test(name))?.[1];

/** Which category a v1 item belongs to, or undefined when it can't be placed. */
export function categoryFor(item: WardrobeItem): CategoryId | undefined {
  const n = item.name;
  switch (item.layer) {
    case 'base':
      return match(BASE, n) ?? (item.warmth <= 2 ? 'tshirt' : item.warmth === 3 ? 'longsleeve' : 'thermal');
    case 'mid':
      return match(MID, n) ?? 'jumper';
    case 'outer':
      return match(OUTER, n) ?? (item.waterproof ? 'waterproof-jacket' : item.warmth >= 4 ? 'insulated-jacket' : 'light-jacket');
    case 'accessory':
      // Shoes were filed under extras in v1; only a waterproof one is worth a separate category.
      if (/shoe/i.test(n)) return item.waterproof ? 'waterproof-shoes' : 'trainers';
      return match(ACCESSORY, n);
  }
}

/** v1 warmth ran 1–5; 3 was the everyday middle. */
export const thicknessFor = (warmth: number): Thickness => (warmth <= 2 ? 'thin' : warmth === 3 ? 'medium' : 'thick');

/**
 * Maps wardrobe v1 named items into the category inventory, merged into
 * `into`. Anything already in the inventory wins: counts take the larger of
 * the two so running it twice never inflates them, and existing properties
 * are never overwritten.
 */
export function migrateWardrobe(items: WardrobeItem[], into: Inventory = {}): Inventory {
  const found: Inventory = {};
  for (const item of items) {
    const id = categoryFor(item);
    if (!id) continue;
    const cat = category(id);
    const t: Thickness = cat.thickness ? thicknessFor(item.warmth) : 'medium';
    const e: InventoryEntry = found[id] ?? { counts: {} };
    e.counts = { ...e.counts, [t]: (e.counts[t] ?? 0) + 1 };
    // A v1 flag of false only meant "not ticked", so it never becomes a "none".
    if (item.waterproof) e.water = 'waterproof';
    if (item.windproof) e.wind = 'high';
    const name = item.name.trim();
    if (cat.group === 'outer' && name && !e.nickname) e.nickname = name;
    found[id] = e;
  }

  const out: Inventory = { ...into };
  for (const [id, e] of Object.entries(found) as [CategoryId, InventoryEntry][]) {
    const prev = into[id];
    if (!prev) {
      out[id] = e;
      continue;
    }
    const counts = { ...prev.counts };
    for (const [t, n] of Object.entries(e.counts) as [Thickness, number][]) counts[t] = Math.max(counts[t] ?? 0, n);
    out[id] = {
      ...prev,
      counts,
      water: prev.water ?? e.water,
      wind: prev.wind ?? e.wind,
      nickname: prev.nickname ?? e.nickname,
    };
    for (const k of ['water', 'wind', 'nickname'] as const) if (out[id]![k] === undefined) delete out[id]![k];
  }
  return out;
}

/** Moves any v1 wardrobe into the inventory once, then retires it. */
export function runWardrobeMigration(): void {
  const items = wardrobe.value;
  if (!Array.isArray(items) || !items.length) return;
  inventory.value = migrateWardrobe(items, inventory.value);
  wardrobe.value = [];
}
