// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

export type AirLevel = 'low' | 'moderate' | 'high' | 'very high';

export interface AirSample {
  grass?: number;
  tree?: number;
  weed?: number;
  /** European AQI, 0–100+. */
  aqi?: number;
  pm25?: number;
}

export interface AirChip {
  id: 'grass' | 'tree' | 'weed' | 'aqi';
  label: string;
  level: AirLevel;
}

// Grains/m³. Grass follows Met Office bands; tree and weed use the bands
// common to European pollen services.
const POLLEN: Record<'grass' | 'tree' | 'weed', [number, number, number]> = {
  grass: [30, 50, 150],
  tree: [40, 80, 200],
  weed: [10, 50, 150],
};

// European AQI: 40 is where "fair" turns to "moderate".
const AQI: [number, number, number] = [40, 60, 80];

export function level(value: number, [m, h, vh]: [number, number, number]): AirLevel {
  if (value >= vh) return 'very high';
  if (value >= h) return 'high';
  if (value >= m) return 'moderate';
  return 'low';
}

const NAMES = { grass: 'Grass pollen', tree: 'Tree pollen', weed: 'Weed pollen' } as const;

/** Only moderate-or-worse readings are worth a chip. */
export function airChips(s: AirSample): AirChip[] {
  const out: AirChip[] = [];
  for (const k of ['tree', 'grass', 'weed'] as const) {
    const v = s[k];
    if (v === undefined) continue;
    const l = level(v, POLLEN[k]);
    if (l !== 'low') out.push({ id: k, label: `${NAMES[k]} ${l}`, level: l });
  }
  if (s.aqi !== undefined) {
    const l = level(s.aqi, AQI);
    if (l !== 'low') out.push({ id: 'aqi', label: `Air quality ${l === 'moderate' ? 'moderate' : 'poor'}`, level: l });
  }
  return out;
}
