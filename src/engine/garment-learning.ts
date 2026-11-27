// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { CategoryId, Thickness } from './inventory';
import { LEARN_HALF_LIFE_DAYS } from './learning';
import type { GarmentCorrection, LayerAdvice, Rating } from './types';

/**
 * Learned warmth per garment, in warmth points, keyed `${category}:${thickness}`
 * (US-039). The `layers` key holds the shift to the insulation target learned
 * from "too many layers". Kept apart from the personal offset, so a coat that
 * runs cold never makes you "feel the cold".
 */
export type GarmentWarmth = Record<string, number>;

export const LAYERS_KEY = 'layers';
/** Points per correction on the day it is given. */
export const GARMENT_STEP = 0.5;
/** A garment is never more than a point warmer or cooler than its thickness says. */
export const GARMENT_CAP = 1;
/** One correction is an anecdote; it takes this many more in one direction than the other to learn. */
export const GARMENT_MIN_NET = 2;
/** "Too many layers" only trims the target a little: the temperature offset does the heavy lifting. */
export const LAYERS_STEP = 0.25;
export const LAYERS_CAP = 0.5;

export const garmentKey = (category: CategoryId, thickness: Thickness): string => `${category}:${thickness}`;

export function parseGarmentKey(key: string): { category: CategoryId; thickness: Thickness } | null {
  const [category, thickness] = key.split(':');
  if (!category || (thickness !== 'thin' && thickness !== 'medium' && thickness !== 'thick')) return null;
  return { category: category as CategoryId, thickness };
}

const weight = (date: string, today: string) => 0.5 ** (Math.max(0, (Date.parse(today) - Date.parse(date)) / 86_400_000) / LEARN_HALF_LIFE_DAYS);
const round1 = (n: number) => (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10 + 0;
const clamp = (n: number, cap: number) => Math.max(-cap, Math.min(cap, n));

interface Tally {
  net: number;
  sum: number;
}

/**
 * "Too warm" means the garment is warmer than its thickness suggests, so its
 * points go up and it gets picked for colder days. Corrections in opposite
 * directions cancel, both in the count and in the weighted sum.
 */
export function learnGarmentWarmth(ratings: Rating[], today: string): GarmentWarmth {
  const tallies = new Map<string, Tally>();
  let layersCount = 0;
  let layersSum = 0;
  for (const r of ratings) {
    const w = weight(r.date, today);
    const seen = new Set<string>();
    for (const c of r.corrections ?? []) {
      if (!c.thickness) continue;
      const key = garmentKey(c.category, c.thickness);
      // A rating is one day; marking the same piece twice that day is still one vote.
      if (seen.has(key)) continue;
      seen.add(key);
      const sign = c.verdict === 'too-warm' ? 1 : -1;
      const t = tallies.get(key) ?? { net: 0, sum: 0 };
      t.net += sign;
      t.sum += sign * GARMENT_STEP * w;
      tallies.set(key, t);
    }
    if (r.detail === 'too-many-layers') {
      layersCount += 1;
      layersSum += LAYERS_STEP * w;
    }
  }
  const out: GarmentWarmth = {};
  for (const [key, t] of tallies) {
    if (Math.abs(t.net) < GARMENT_MIN_NET) continue;
    const v = round1(clamp(t.sum, GARMENT_CAP));
    if (v !== 0) out[key] = v;
  }
  if (layersCount >= GARMENT_MIN_NET) {
    const v = round1(-Math.min(LAYERS_CAP, layersSum));
    if (v !== 0) out[LAYERS_KEY] = v;
  }
  return out;
}

const sameGarment = (c: GarmentCorrection, key: string) => !!c.thickness && garmentKey(c.category, c.thickness) === key;

function without(r: Rating, field: 'detail' | 'corrections'): Rating {
  const next = { ...r };
  delete next[field];
  return next;
}

/** Forgets what one row learned by dropping its source feedback; temperature ratings stay. */
export function forgetGarment(ratings: Rating[], key: string): Rating[] {
  return ratings.map((r) => {
    if (key === LAYERS_KEY) return r.detail === 'too-many-layers' ? without(r, 'detail') : r;
    if (!r.corrections?.some((c) => sameGarment(c, key))) return r;
    const corrections = r.corrections.filter((c) => !sameGarment(c, key));
    return corrections.length ? { ...r, corrections } : without(r, 'corrections');
  });
}

export function forgetAllGarments(ratings: Rating[]): Rating[] {
  return ratings.map((r) => {
    const next = r.corrections ? without(r, 'corrections') : r;
    return next.detail === 'too-many-layers' ? without(next, 'detail') : next;
  });
}

export function sameWarmth(a: GarmentWarmth, b: GarmentWarmth): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

export interface Piece {
  key: string;
  name: string;
  category: CategoryId;
  thickness: Thickness;
}

/** Owned tops, mids and outers from today's advice: the only pieces whose warmth the engine scores. */
export function correctablePieces(layers: LayerAdvice[]): Piece[] {
  const out: Piece[] = [];
  for (const l of layers) {
    if (l.owned !== 'owned' || !l.category || !l.thickness) continue;
    if (l.kind !== 'base' && l.kind !== 'mid' && l.kind !== 'outer') continue;
    const key = garmentKey(l.category, l.thickness);
    if (out.some((p) => p.key === key)) continue;
    out.push({ key, name: l.nickname ? `Your ${l.nickname}` : l.label, category: l.category, thickness: l.thickness });
  }
  return out;
}
