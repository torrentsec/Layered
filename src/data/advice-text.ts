// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { CategoryId, Thickness } from '../engine/inventory';
import type { Requirements } from '../engine/requirements';
import type { LayerAdvice } from '../engine/types';

/** Catalogue names are plural headings; a single garment reads better singular. */
const SINGULAR: Partial<Record<CategoryId, string>> = {
  tshirt: 'T-shirt',
  longsleeve: 'long-sleeve top',
  thermal: 'thermal top',
  jumper: 'jumper',
  cardigan: 'cardigan',
  hoodie: 'hoodie or sweatshirt',
  fleece: 'fleece',
  'light-jacket': 'light jacket',
  'insulated-jacket': 'insulated jacket',
  coat: 'coat',
  'waterproof-jacket': 'waterproof jacket',
};

const THICK_WORD: Record<Thickness, string> = { thin: 'Thin', medium: 'Medium', thick: 'Thick' };

/** "Medium jumper" when the engine names a category and thickness, otherwise its label. */
export function genericName(l: LayerAdvice): string {
  const noun = l.category && SINGULAR[l.category];
  return l.thickness && noun ? `${THICK_WORD[l.thickness]} ${noun}` : l.label;
}

export interface LayerText {
  title: string;
  sub?: string;
  general: boolean;
}

export function layerText(l: LayerAdvice): LayerText {
  const general = l.owned === 'unknown';
  if (l.nickname) return { title: `Your ${l.nickname}`, sub: genericName(l), general };
  return { title: genericName(l), general };
}

/** Anything not matched to the inventory is general advice. */
export function fromWardrobe(l: LayerAdvice): boolean {
  return l.owned === 'owned';
}

/** The outer layer in a few words: "Your navy puffer" when it's from the wardrobe, else the general label. */
export function outerText(layers: LayerAdvice[]): string | undefined {
  const l = layers.find((x) => x.kind === 'outer' && !x.optional);
  if (!l) return undefined;
  if (l.owned !== 'owned') return l.label;
  return `Your ${l.nickname ?? l.label.toLowerCase()}`;
}

export function insulationWords(points: number): string {
  if (points <= 1) return 'Very little';
  if (points <= 3) return 'A little';
  if (points <= 5) return 'Moderate';
  if (points <= 7) return 'Warm';
  return 'Very warm';
}

const RAIN: Record<Requirements['rain'], string> = {
  none: 'Not needed',
  umbrella: 'An umbrella will do',
  waterproof: 'A waterproof layer',
  hood: 'A waterproof with a hood',
};

const WIND: Record<Requirements['wind'], string> = {
  none: 'Not needed',
  low: 'A little',
  medium: 'Something that blocks wind',
  high: 'Fully windproof',
};

const FOOTWEAR: Record<Requirements['footwear'], string> = {
  open: 'Anything, sandals are fine',
  any: 'Anything',
  closed: 'Closed shoes',
  waterproof: 'Waterproof shoes',
  boots: 'Boots',
};

const BOTTOMS: Record<Requirements['bottoms'], string> = {
  shorts: 'Shorts are fine',
  light: 'Light trousers',
  standard: 'Trousers or jeans',
  heavy: 'Heavy trousers',
};

export interface NeedRow {
  label: string;
  value: string;
}

export function needsRows(r: Requirements): NeedRow[] {
  return [
    { label: 'Warmth', value: insulationWords(r.insulation) },
    { label: 'Rain', value: RAIN[r.rain] },
    { label: 'Wind', value: WIND[r.wind] },
    { label: 'Legs', value: BOTTOMS[r.bottoms] },
    { label: 'Feet', value: FOOTWEAR[r.footwear] },
    ...(r.removable ? [{ label: 'Layers', value: 'Easy to take off' }] : []),
  ];
}

/** Labels for the Suggested / Alternative switch; more than two alternatives would crowd it. */
export function choiceOptions(alternatives: number): { value: number; label: string }[] {
  const n = Math.min(alternatives, 2);
  const alt = Array.from({ length: n }, (_, i) => ({ value: i + 1, label: n === 1 ? 'Alternative' : `Alternative ${i + 1}` }));
  return [{ value: 0, label: 'Suggested' }, ...alt];
}
