// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Hour } from './types';
import { fmt24, hourOf, type TimeFormatter } from './time';

// A 40% hour is the point where most people would call it "might rain";
// a measurable 0.1 mm catches drizzle the probability model underplays.
export function isWet(h: Hour): boolean {
  return h.precipProb >= 40 || h.precip >= 0.1 || h.snow > 0;
}

const SHOWER_CODES = new Set([80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const DRIZZLE_CODES = new Set([51, 53, 55, 56, 57]);

export function wetWord(hours: Hour[]): string {
  const wet = hours.filter(isWet);
  if (wet.some((h) => h.snow > 0 || SNOW_CODES.has(h.code))) return 'snow';
  if (wet.some((h) => SHOWER_CODES.has(h.code))) return 'showers';
  if (wet.length && wet.every((h) => DRIZZLE_CODES.has(h.code) || h.precip < 0.3)) return 'drizzle';
  if (wet.length > 0 && wet.length <= 3) return 'showers';
  return 'rain';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** First wet hour, if any. Used to word commute differences. */
export function firstWet(hours: Hour[]): Hour | undefined {
  return hours.find(isWet);
}

/**
 * One plain-English sentence about rain across `hours`, e.g. "Dry until
 * 15:00, then showers". Callers pass the rest of the day; the sentence talks
 * about "all day" only if the range runs to the evening.
 */
export function rainSummary(hours: Hour[], fmt: TimeFormatter = fmt24): string {
  if (!hours.length) return '';
  const wet = hours.map(isWet);
  const word = wetWord(hours);
  const end = hours[hours.length - 1];
  const toEvening = hourOf(end.time) >= 20 || end.time.slice(0, 10) !== hours[0].time.slice(0, 10);
  const span = toEvening ? 'all day' : `until ${fmt(end.time)}`;

  if (!wet.some(Boolean)) return toEvening ? 'Dry all day' : `Dry ${span}`;
  if (wet.every(Boolean)) return `${cap(word)} ${span}`;

  const firstWetIdx = wet.indexOf(true);
  const firstDryIdx = wet.indexOf(false);

  if (firstWetIdx === 0) {
    const backIdx = wet.indexOf(true, firstDryIdx);
    const clears = fmt(hours[firstDryIdx].time);
    if (backIdx < 0) return `${cap(word)} clearing by ${clears}`;
    return `${cap(word)} easing by ${clears}, back from ${fmt(hours[backIdx].time)}`;
  }

  const startsAt = fmt(hours[firstWetIdx].time);
  const dryAgainIdx = wet.indexOf(false, firstWetIdx);
  if (dryAgainIdx < 0) return `Dry until ${startsAt}, then ${word}`;
  const anotherIdx = wet.indexOf(true, dryAgainIdx);
  if (anotherIdx < 0) {
    return `${cap(word)} ${startsAt}–${fmt(hours[dryAgainIdx].time)}, otherwise dry`;
  }
  return `Dry until ${startsAt}, then on and off ${word}`;
}
