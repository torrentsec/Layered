// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

export type TempUnit = 'c' | 'f';
export type WindUnit = 'kmh' | 'mph' | 'ms';
export type Clock = '24' | '12';

export interface Units {
  temp: TempUnit;
  wind: WindUnit;
  clock: Clock;
}

export const DEFAULT_UNITS: Units = { temp: 'c', wind: 'kmh', clock: '24' };

export function temp(c: number, u: TempUnit): number {
  return Math.round(u === 'f' ? (c * 9) / 5 + 32 : c);
}

/** Temperature differences convert without the +32. */
export function tempDelta(c: number, u: TempUnit): number {
  const v = u === 'f' ? (c * 9) / 5 : c;
  return Math.round(v * 10) / 10;
}

/**
 * The "dress for" figure rounds down: band edges are whole degrees, so 1.7°
 * must not read as 2° next to "Bundle up".
 */
export function fmtDressFor(c: number, u: TempUnit): string {
  return `${Math.floor(u === 'f' ? (c * 9) / 5 + 32 : c)}°`;
}

export function fmtTemp(c: number, u: TempUnit): string {
  return `${temp(c, u)}°`;
}

export function wind(kmh: number, u: WindUnit): string {
  if (u === 'mph') return `${Math.round(kmh / 1.609)} mph`;
  if (u === 'ms') return `${Math.round(kmh / 3.6)} m/s`;
  return `${Math.round(kmh)} km/h`;
}

/** Rewrites "40 km/h" inside engine-produced text into the user's unit. */
export function localiseWind(text: string, u: WindUnit): string {
  if (u === 'kmh') return text;
  return text.replace(/(\d+(?:\.\d+)?) km\/h/g, (_, n: string) => wind(Number(n), u));
}

/**
 * Rewrites temperatures inside engine text into the user's unit. "+5°" is a
 * difference and converts without the offset; "4°" and "-2.5°" are readings.
 */
export function localiseTemp(text: string, u: TempUnit): string {
  if (u === 'c') return text;
  return text
    .replace(/\+(\d+(?:\.\d+)?)°/g, (_, n: string) => `+${Math.round(tempDelta(Number(n), u))}°`)
    .replace(/(?<![+\d.])(-?\d+(?:\.\d+)?)°/g, (_, n: string) => `${temp(Number(n), u)}°`);
}
