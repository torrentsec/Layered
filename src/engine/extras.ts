// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Activity, Extra, Hour } from './types';

export const RAIN = { umbrellaProb: 30, waterproofProb: 60, waterproofMm: 1, umbrellaMaxGust: 40 } as const;
export const COLD = { gloves: 5, hat: 3, hatWindy: 8, hatWind: 25, scarf: 0 } as const;
export const UV = { sunglasses: 3, sunscreen: 6 } as const;
export const GUST_WARNING = 50;
export const SWING_DEGREES = 5;

export interface WindowStats {
  maxProb: number;
  totalPrecip: number;
  maxGust: number;
  maxWind: number;
  maxUv: number;
  snow: boolean;
  dark: boolean;
  /** Largest rise in feels-like from an earlier hour to a later one. */
  warming: number;
}

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export function windowStats(hours: Hour[]): WindowStats {
  let warming = 0;
  let lowest = Infinity;
  for (const h of hours) {
    lowest = Math.min(lowest, h.feels);
    warming = Math.max(warming, h.feels - lowest);
  }
  return {
    maxProb: Math.max(0, ...hours.map((h) => h.precipProb)),
    totalPrecip: hours.reduce((s, h) => s + h.precip, 0),
    maxGust: Math.max(0, ...hours.map((h) => h.gusts)),
    maxWind: Math.max(0, ...hours.map((h) => h.wind)),
    maxUv: Math.max(0, ...hours.map((h) => h.uv)),
    snow: hours.some((h) => h.snow > 0 || SNOW_CODES.has(h.code)),
    dark: hours.some((h) => !h.isDay),
    warming,
  };
}

const r0 = (n: number) => Math.round(n);

export function extrasFor(stats: WindowStats, effective: number, activity: Activity): Extra[] {
  const out: Extra[] = [];
  const rainy = stats.maxProb >= RAIN.umbrellaProb;
  const soaking = stats.maxProb >= RAIN.waterproofProb || stats.totalPrecip >= RAIN.waterproofMm;
  const rainWhy = `${r0(stats.maxProb)}% chance, ${stats.totalPrecip.toFixed(1)} mm`;

  // Umbrellas are useless in a gale, and runners and cyclists can't hold one.
  const handsBusy = activity === 'cycling' || activity === 'running';
  if ((rainy || soaking) && (stats.maxGust > RAIN.umbrellaMaxGust || handsBusy)) {
    out.push({
      id: 'hood',
      label: 'Hooded waterproof',
      tone: 'rain',
      reason:
        stats.maxGust > RAIN.umbrellaMaxGust
          ? `Rain (${rainWhy}) with gusts to ${r0(stats.maxGust)} km/h, too windy for an umbrella`
          : `Rain (${rainWhy}) and your hands are busy`,
    });
  } else {
    if (rainy) out.push({ id: 'umbrella', label: 'Umbrella', tone: 'rain', reason: `Rain chance reaches ${r0(stats.maxProb)}%` });
    if (soaking) out.push({ id: 'waterproof', label: 'Waterproof', tone: 'rain', reason: `Proper rain likely (${rainWhy})` });
  }

  if (effective < COLD.gloves) out.push({ id: 'gloves', label: 'Gloves', tone: 'cold', reason: `Feels like ${r0(effective)}°, under ${COLD.gloves}°` });
  if (effective < COLD.hat) {
    out.push({ id: 'hat', label: 'Hat', tone: 'cold', reason: `Feels like ${r0(effective)}°, under ${COLD.hat}°` });
  } else if (effective < COLD.hatWindy && stats.maxWind > COLD.hatWind) {
    out.push({ id: 'hat', label: 'Hat', tone: 'cold', reason: `Wind ${r0(stats.maxWind)} km/h with feels-like under ${COLD.hatWindy}°` });
  }
  if (effective < COLD.scarf) out.push({ id: 'scarf', label: 'Scarf', tone: 'cold', reason: `Below freezing (${r0(effective)}°)` });
  if (stats.snow) out.push({ id: 'boots', label: 'Boots', tone: 'cold', reason: 'Snow in the forecast' });

  if (stats.maxUv >= UV.sunglasses) out.push({ id: 'sunglasses', label: 'Sunglasses', tone: 'sun', reason: `UV ${r0(stats.maxUv)}` });
  if (stats.maxUv >= UV.sunscreen) out.push({ id: 'sunscreen', label: 'Sunscreen', tone: 'sun', reason: `UV ${r0(stats.maxUv)}, high` });

  if (stats.maxGust > GUST_WARNING) out.push({ id: 'gusts', label: `Gusts ${r0(stats.maxGust)} km/h`, tone: 'warn', reason: `Gusts over ${GUST_WARNING} km/h` });
  if (stats.dark && handsBusy) out.push({ id: 'reflective', label: 'Reflective kit', tone: 'warn', reason: `Dark while ${activity}` });
  if (stats.warming >= SWING_DEGREES) {
    out.push({ id: 'swing', label: 'Layers you can take off', tone: 'info', reason: `Feels-like rises +${r0(stats.warming)}° while you're out` });
  }
  return out;
}
