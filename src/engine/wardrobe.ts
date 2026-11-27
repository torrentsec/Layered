// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { BandId, Extra, LayerAdvice, LayerKind, WardrobeItem } from './types';

// Warmth (1–5) each layer should have in each band; 0 means "not needed".
const TARGET: Record<BandId, Record<LayerKind, number>> = {
  tshirt: { base: 1, mid: 0, outer: 0 },
  light: { base: 1, mid: 1, outer: 0 },
  two: { base: 2, mid: 2, outer: 0 },
  jacket: { base: 2, mid: 3, outer: 2 },
  coat: { base: 3, mid: 3, outer: 4 },
  bundle: { base: 5, mid: 5, outer: 5 },
};

export function targetWarmth(band: BandId, kind: LayerKind): number {
  return TARGET[band][kind];
}

interface Conditions {
  wet: boolean;
  windy: boolean;
}

export function scoreItem(item: WardrobeItem, target: number, c: Conditions): number {
  let score = Math.abs(item.warmth - target);
  if (c.wet && !item.waterproof) score += 1.5;
  if (c.windy && !item.windproof) score += 0.5;
  return score;
}

export function bestItem(items: WardrobeItem[], kind: LayerKind, target: number, c: Conditions): WardrobeItem | undefined {
  let best: WardrobeItem | undefined;
  let bestScore = Infinity;
  for (const item of items) {
    if (item.layer !== kind) continue;
    // Only the outer layer has to keep the rain off.
    const s = scoreItem(item, target, kind === 'outer' ? c : { wet: false, windy: c.windy && kind !== 'base' });
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  // Two steps off is the point where "your gilet" would be worse advice than "a warm coat".
  return best && bestScore <= 2.5 ? best : undefined;
}

const ACCESSORY_MATCH: Partial<Record<Extra['id'], RegExp>> = {
  umbrella: /umbrella|brolly/i,
  gloves: /glove|mitt/i,
  hat: /hat|beanie|toque|cap\b/i,
  scarf: /scarf|snood|neck/i,
  boots: /boot/i,
  sunglasses: /sunglass|shades/i,
  reflective: /reflect|hi-?vis|bib/i,
};

/**
 * Swaps generic advice for named items from the wardrobe. If a wet day needs a
 * waterproof and the chosen coat is one, the separate waterproof is dropped.
 */
export function applyWardrobe(
  band: BandId,
  layers: LayerAdvice[],
  extras: Extra[],
  items: WardrobeItem[],
  c: Conditions,
): { layers: LayerAdvice[]; extras: Extra[] } {
  if (!items.length) return { layers, extras };
  let out = layers.map((l) => {
    if (l.kind === 'bottoms' || l.kind === 'footwear') return l;
    const item = bestItem(items, l.kind, targetWarmth(band, l.kind), c);
    return item ? { ...l, item } : l;
  });

  const needsShell = extras.some((e) => e.id === 'waterproof' || e.id === 'hood');
  const outer = out.find((l) => l.kind === 'outer');
  let nextExtras = extras;
  if (needsShell && outer?.item?.waterproof) {
    nextExtras = extras.filter((e) => e.id !== 'waterproof' && e.id !== 'hood');
  } else if (needsShell && !outer) {
    const shell = items
      .filter((i) => i.layer === 'outer' && i.waterproof)
      .sort((a, b) => a.warmth - b.warmth)[0];
    if (shell) {
      out = [...out, { kind: 'outer', label: 'Waterproof', item: shell }];
      nextExtras = extras.filter((e) => e.id !== 'waterproof' && e.id !== 'hood');
    }
  }

  nextExtras = nextExtras.map((e) => {
    const re = ACCESSORY_MATCH[e.id];
    const item = re && items.find((i) => i.layer === 'accessory' && re.test(i.name));
    return item ? { ...e, item } : e;
  });
  return { layers: out, extras: nextExtras };
}
