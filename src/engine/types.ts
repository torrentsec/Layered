// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { CategoryId, Ownership, Thickness } from './inventory';
import type { Requirements } from './requirements';

/**
 * One forecast hour. Everything is metric (°C, km/h, mm, cm) so the engine
 * never has to care about display units. `time` is the place's local wall
 * clock ("2026-11-26T08:00"), which keeps the engine free of time-zone maths.
 */
export interface Hour {
  time: string;
  temp: number;
  feels: number;
  precipProb: number;
  precip: number;
  snow: number;
  wind: number;
  gusts: number;
  uv: number;
  isDay: boolean;
  code: number;
  visibility?: number;
}

export type Activity = 'walking' | 'standing' | 'cycling' | 'transport' | 'running' | 'hiking' | 'night';

export type LayerKind = 'base' | 'mid' | 'outer';
export type ItemKind = LayerKind | 'accessory';

export type BandId = 'tshirt' | 'light' | 'two' | 'jacket' | 'coat' | 'bundle';

export interface WardrobeItem {
  id: string;
  name: string;
  layer: ItemKind;
  warmth: 1 | 2 | 3 | 4 | 5;
  waterproof: boolean;
  windproof: boolean;
  color?: string;
}

export interface LayerAdvice {
  kind: LayerKind | 'bottoms' | 'footwear';
  label: string;
  optional?: boolean;
  /** Legacy named item from wardrobe v1. Replaced by the category inventory. */
  item?: WardrobeItem;
  category?: CategoryId;
  thickness?: Thickness;
  /** Outerwear nickname, shown as "your <nickname>". */
  nickname?: string;
  /** 'owned' when matched to the inventory; 'unknown' when it's generic advice. */
  owned?: Ownership;
}

export type ExtraId =
  | 'umbrella'
  | 'waterproof'
  | 'hood'
  | 'gloves'
  | 'hat'
  | 'scarf'
  | 'boots'
  | 'sunglasses'
  | 'sunscreen'
  | 'gusts'
  | 'reflective'
  | 'swing';

export interface Extra {
  id: ExtraId;
  label: string;
  tone: 'rain' | 'cold' | 'sun' | 'warn' | 'info';
  reason: string;
  item?: WardrobeItem;
}

export interface Rating {
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** -1 too cold, 0 just right, 1 too warm. */
  rating: -1 | 0 | 1;
  effective: number;
  activity: Activity;
}

export interface Explanation {
  coldestHour: string;
  coldestFeels: number;
  activity: Activity;
  activityOffset: number;
  manualOffset: number;
  learnedOffset: number;
  learnedFrom: 'activity' | 'all' | 'none';
  effective: number;
  band: BandId;
  rules: string[];
}

export interface Advice {
  /** Stage 2 output, kept for "Why this?" and for the notification text. */
  requirements?: Requirements;
  /** Plain-language gaps, e.g. "No waterproof recorded in your wardrobe". */
  limitations?: string[];
  /** Other equally suitable combinations from owned clothes (US-034). */
  alternatives?: LayerAdvice[][];
  band: BandId;
  verdict: string;
  summary: string;
  effective: number;
  minFeels: number;
  maxFeels: number;
  layers: LayerAdvice[];
  extras: Extra[];
  hours: Hour[];
  why: Explanation;
}
