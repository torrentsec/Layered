// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { bandRank } from './bands';
import type { Advice, BandId, ExtraId } from './types';

export interface PackItem {
  id: string;
  label: string;
  qty: number;
  kind: 'base' | 'mid' | 'outer' | 'accessory';
}

/** Beyond a week, plan on doing a wash rather than packing more tops. */
export const MAX_BASE = 7;
/** A jumper survives about three days of wear. */
export const MID_REWEAR_DAYS = 3;
export const MAX_MID = 3;

const OUTER_LABEL: Partial<Record<BandId, string>> = {
  jacket: 'Jacket',
  coat: 'Warm coat',
  bundle: 'Heavy coat',
};

const ACCESSORIES: [ExtraId, string][] = [
  ['umbrella', 'Umbrella'],
  ['gloves', 'Gloves'],
  ['hat', 'Hat'],
  ['scarf', 'Scarf'],
  ['boots', 'Boots'],
  ['sunglasses', 'Sunglasses'],
  ['sunscreen', 'Sunscreen'],
  ['reflective', 'Reflective kit'],
];

export function packingList(days: Advice[]): PackItem[] {
  const n = days.length;
  if (!n) return [];
  const has = (id: ExtraId) => days.some((d) => d.extras.some((e) => e.id === id));
  const bands = days.map((d) => d.band);
  const coldest = bands.reduce((a, b) => (bandRank(b) > bandRank(a) ? b : a));

  const out: PackItem[] = [];
  const warmDays = bands.filter((b) => b === 'tshirt' || b === 'light').length;
  const coolDays = n - warmDays;
  const thermalDays = bands.filter((b) => b === 'bundle').length;

  if (warmDays) out.push({ id: 'tshirt', label: 'T-shirts', qty: Math.min(warmDays, MAX_BASE), kind: 'base' });
  if (coolDays - thermalDays > 0) {
    out.push({ id: 'base', label: 'Base layers', qty: Math.min(coolDays - thermalDays, MAX_BASE), kind: 'base' });
  }
  if (thermalDays) out.push({ id: 'thermal', label: 'Thermal base layers', qty: Math.min(thermalDays, MAX_BASE), kind: 'base' });

  const midDays = days.filter((d) => d.layers.some((l) => l.kind === 'mid' && !l.optional)).length;
  const optionalMid = days.some((d) => d.layers.some((l) => l.kind === 'mid' && l.optional));
  if (midDays) {
    const thick = bands.includes('bundle');
    out.push({
      id: 'mid',
      label: thick ? 'Jumpers (one thick)' : 'Jumpers',
      qty: Math.min(MAX_MID, Math.max(1, Math.ceil(midDays / MID_REWEAR_DAYS))),
      kind: 'mid',
    });
  } else if (optionalMid) {
    out.push({ id: 'mid', label: 'Light layer', qty: 1, kind: 'mid' });
  }

  // One outer layer for the whole trip, sized for the coldest day.
  const wet = has('waterproof') || has('hood');
  const outer = OUTER_LABEL[coldest];
  if (outer) out.push({ id: 'outer', label: wet ? `${outer} (waterproof if you have one)` : outer, qty: 1, kind: 'outer' });
  else if (wet) out.push({ id: 'outer', label: 'Light waterproof jacket', qty: 1, kind: 'outer' });
  if (wet && outer) out.push({ id: 'waterproof', label: 'Packable waterproof', qty: 1, kind: 'outer' });

  for (const [id, label] of ACCESSORIES) if (has(id)) out.push({ id, label, qty: 1, kind: 'accessory' });
  return out;
}

export function packingText(title: string, items: PackItem[], checked: Record<string, boolean> = {}): string {
  const lines = items.map((i) => `${checked[i.id] ? '[x]' : '[ ]'} ${i.label}${i.qty > 1 ? ` × ${i.qty}` : ''}`);
  return [title, '', ...lines].join('\n');
}
