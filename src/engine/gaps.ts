// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { category, ownership, type CategoryId, type Inventory } from './inventory';
import { slotCategories } from './match';
import type { Requirements } from './requirements';

/**
 * US-015: of the categories still "not set", the few that would change
 * today's advice if the user filled them in. Everything else can wait, so
 * the list stays short enough to act on.
 */
export interface Gap {
  id: CategoryId;
  reason: string;
}

export const MAX_GAPS = 3;

/**
 * Higher goes first. Staying dry and the outer layer shape the outfit most;
 * accessories only add or drop a chip.
 */
export const GAP_IMPACT = {
  waterproof: 100,
  outer: 90,
  footwear: 70,
  mid: 60,
  base: 50,
  gloves: 40,
  hat: 35,
  scarf: 30,
  umbrella: 25,
} as const;

const water = (inv: Inventory, id: CategoryId) => inv[id]?.water ?? category(id).defaults.water;
const unknown = (inv: Inventory, id: CategoryId) => ownership(inv, id) === 'unknown';
const owned = (inv: Inventory, id: CategoryId) => ownership(inv, id) === 'owned';

export function missingForToday(r: Requirements, inv: Inventory = {}): Gap[] {
  const found: (Gap & { impact: number })[] = [];
  const add = (id: CategoryId | undefined, impact: number, reason: string) => {
    if (id && !found.some((g) => g.id === id)) found.push({ id, impact, reason });
  };
  const slots = slotCategories(r);
  // The first fitting category the user hasn't set, unless something they own already fills the slot.
  const firstUnset = (ids: CategoryId[] = []) => (ids.some((id) => owned(inv, id)) ? undefined : ids.find((id) => unknown(inv, id)));

  const wet = r.rain === 'waterproof' || r.rain === 'hood';
  const outerIds = slotCategories({ ...r, layers: { ...r.layers, outer: 'thin' } }).outer!;
  if (wet && !outerIds.some((id) => owned(inv, id) && water(inv, id) === 'waterproof') && unknown(inv, 'waterproof-jacket')) {
    add('waterproof-jacket', GAP_IMPACT.waterproof, 'Rain today calls for a waterproof');
  }
  add(firstUnset(slots.outer), GAP_IMPACT.outer, 'Today needs a coat or jacket');

  if (r.footwear === 'waterproof' || r.footwear === 'boots') {
    const dry = slots.footwear!.filter((id) => water(inv, id) !== 'none');
    if (!dry.some((id) => owned(inv, id))) {
      add(dry.find((id) => unknown(inv, id)), GAP_IMPACT.footwear, r.footwear === 'boots' ? 'Boots weather today' : 'Wet underfoot today');
    }
  }

  add(firstUnset(slots.mid), GAP_IMPACT.mid, 'Today needs a warm mid layer');
  add(firstUnset(slots.base), GAP_IMPACT.base, 'Picks the right base layer');

  for (const id of ['gloves', 'hat', 'scarf'] as const) {
    if (r.accessories.includes(id) && unknown(inv, id)) add(id, GAP_IMPACT[id], `Cold enough for ${id === 'gloves' ? 'gloves' : `a ${id}`}`);
  }
  if (r.rain === 'umbrella' && unknown(inv, 'umbrella')) add('umbrella', GAP_IMPACT.umbrella, 'Showers likely');

  return found
    .sort((a, b) => b.impact - a.impact)
    .slice(0, MAX_GAPS)
    .map(({ id, reason }) => ({ id, reason }));
}
