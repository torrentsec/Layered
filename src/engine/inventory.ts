// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * The clothing inventory: quantities per category and thickness, not a
 * digital closet. "Not set" (no entry, or no count for a thickness) is kept
 * distinct from "don't own" (a count of 0) so the engine never treats
 * missing information as absence, or absence as ownership.
 */

export type Thickness = 'thin' | 'medium' | 'thick';
export const THICKNESSES: Thickness[] = ['thin', 'medium', 'thick'];

export type Group = 'base' | 'mid' | 'outer' | 'bottoms' | 'footwear' | 'accessory';
export type Level = 'low' | 'medium' | 'high';
export type WaterResistance = 'none' | 'resistant' | 'waterproof';
export type Material = 'wool' | 'cotton' | 'synthetic' | 'fleece' | 'down';

export type CategoryId =
  | 'tshirt'
  | 'longsleeve'
  | 'thermal'
  | 'jumper'
  | 'cardigan'
  | 'hoodie'
  | 'fleece'
  | 'light-jacket'
  | 'insulated-jacket'
  | 'coat'
  | 'waterproof-jacket'
  | 'shorts'
  | 'light-trousers'
  | 'jeans'
  | 'heavy-trousers'
  | 'trainers'
  | 'boots'
  | 'waterproof-shoes'
  | 'sandals'
  | 'hat'
  | 'scarf'
  | 'gloves'
  | 'umbrella';

export interface Category {
  id: CategoryId;
  group: Group;
  name: string;
  description: string;
  /** Whether thickness applies; footwear and some accessories are just "owned". */
  thickness: boolean;
  /** Plain-language examples for each thickness, shown while editing. */
  examples?: Record<Thickness, string>;
  /** Defaults used when the user hasn't said otherwise. */
  defaults: { water: WaterResistance; wind: Level };
}

const ex = (thin: string, medium: string, thick: string): Record<Thickness, string> => ({ thin, medium, thick });

export const CATALOGUE: readonly Category[] = [
  { id: 'tshirt', group: 'base', name: 'T-shirts', description: 'Short-sleeved tops', thickness: true, examples: ex('Lightweight or linen', 'Everyday cotton', 'Heavyweight cotton'), defaults: { water: 'none', wind: 'low' } },
  { id: 'longsleeve', group: 'base', name: 'Long-sleeve tops', description: 'Long-sleeved tops and shirts', thickness: true, examples: ex('Thin jersey or shirt', 'Everyday long sleeve', 'Brushed or waffle knit'), defaults: { water: 'none', wind: 'low' } },
  { id: 'thermal', group: 'base', name: 'Thermal tops', description: 'Base layers worn next to skin for warmth', thickness: true, examples: ex('Lightweight merino', 'Midweight thermal', 'Expedition-weight'), defaults: { water: 'none', wind: 'low' } },
  { id: 'jumper', group: 'mid', name: 'Jumpers', description: 'Knitted pullovers', thickness: true, examples: ex('Lightweight knit', 'Standard everyday knit', 'Heavy or chunky wool'), defaults: { water: 'none', wind: 'low' } },
  { id: 'cardigan', group: 'mid', name: 'Cardigans', description: 'Knitted, button or zip front', thickness: true, examples: ex('Fine knit', 'Everyday knit', 'Chunky knit'), defaults: { water: 'none', wind: 'low' } },
  { id: 'hoodie', group: 'mid', name: 'Hoodies and sweatshirts', description: 'Jersey or fleece-backed', thickness: true, examples: ex('Loopback cotton', 'Brushed fleece-back', 'Heavyweight or lined'), defaults: { water: 'none', wind: 'low' } },
  { id: 'fleece', group: 'mid', name: 'Fleeces', description: 'Synthetic fleece layers', thickness: true, examples: ex('Microfleece', '200-weight fleece', 'Sherpa or high-loft'), defaults: { water: 'none', wind: 'medium' } },
  { id: 'light-jacket', group: 'outer', name: 'Light jackets', description: 'Unlined jackets, overshirts, denim', thickness: true, examples: ex('Windbreaker or overshirt', 'Denim or canvas', 'Lined canvas or wax'), defaults: { water: 'none', wind: 'medium' } },
  { id: 'insulated-jacket', group: 'outer', name: 'Insulated jackets', description: 'Padded or quilted jackets', thickness: true, examples: ex('Thin quilted', 'Everyday puffer', 'Heavy down'), defaults: { water: 'resistant', wind: 'high' } },
  { id: 'coat', group: 'outer', name: 'Coats', description: 'Longer wool or lined coats', thickness: true, examples: ex('Mac or trench', 'Wool overcoat', 'Parka or heavy wool'), defaults: { water: 'none', wind: 'high' } },
  { id: 'waterproof-jacket', group: 'outer', name: 'Waterproof jackets', description: 'Shells and rain jackets', thickness: true, examples: ex('Packable shell', 'Lined rain jacket', 'Insulated waterproof'), defaults: { water: 'waterproof', wind: 'high' } },
  { id: 'shorts', group: 'bottoms', name: 'Shorts', description: '', thickness: false, defaults: { water: 'none', wind: 'low' } },
  { id: 'light-trousers', group: 'bottoms', name: 'Light trousers', description: 'Chinos, linen, joggers', thickness: false, defaults: { water: 'none', wind: 'low' } },
  { id: 'jeans', group: 'bottoms', name: 'Jeans', description: '', thickness: false, defaults: { water: 'none', wind: 'medium' } },
  { id: 'heavy-trousers', group: 'bottoms', name: 'Heavy trousers', description: 'Wool, cord, lined or hiking', thickness: false, defaults: { water: 'none', wind: 'medium' } },
  { id: 'trainers', group: 'footwear', name: 'Trainers', description: '', thickness: false, defaults: { water: 'none', wind: 'low' } },
  { id: 'boots', group: 'footwear', name: 'Boots', description: '', thickness: false, defaults: { water: 'resistant', wind: 'high' } },
  { id: 'waterproof-shoes', group: 'footwear', name: 'Waterproof shoes', description: '', thickness: false, defaults: { water: 'waterproof', wind: 'high' } },
  { id: 'sandals', group: 'footwear', name: 'Sandals', description: '', thickness: false, defaults: { water: 'none', wind: 'low' } },
  { id: 'hat', group: 'accessory', name: 'Hats', description: 'Warm hats and beanies', thickness: false, defaults: { water: 'none', wind: 'medium' } },
  { id: 'scarf', group: 'accessory', name: 'Scarves', description: '', thickness: false, defaults: { water: 'none', wind: 'medium' } },
  { id: 'gloves', group: 'accessory', name: 'Gloves', description: '', thickness: false, defaults: { water: 'none', wind: 'medium' } },
  { id: 'umbrella', group: 'accessory', name: 'Umbrella', description: '', thickness: false, defaults: { water: 'waterproof', wind: 'low' } },
];

export const category = (id: CategoryId): Category => CATALOGUE.find((c) => c.id === id)!;

export interface InventoryEntry {
  /**
   * Quantity per thickness. Categories without thickness use `medium`.
   * A missing key is "not set"; 0 is "don't own".
   */
  counts: Partial<Record<Thickness, number>>;
  insulation?: Level;
  water?: WaterResistance;
  wind?: Level;
  material?: Material[];
  /** Outerwear only: shown as "your <nickname>" in advice. */
  nickname?: string;
}

/** A category with no entry is "not set". */
export type Inventory = Partial<Record<CategoryId, InventoryEntry>>;

export type Ownership = 'owned' | 'none' | 'unknown';

export function ownership(inv: Inventory, id: CategoryId, t?: Thickness): Ownership {
  const e = inv[id];
  if (!e) return 'unknown';
  const keys = t ? [t] : (Object.keys(e.counts) as Thickness[]);
  const known = keys.filter((k) => e.counts[k] !== undefined);
  if (!known.length) return 'unknown';
  return known.some((k) => (e.counts[k] ?? 0) > 0) ? 'owned' : 'none';
}

/** Share of catalogue categories the user has said anything about (US-015). */
export function completeness(inv: Inventory): number {
  return CATALOGUE.filter((c) => ownership(inv, c.id) !== 'unknown').length / CATALOGUE.length;
}
