// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

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
 * Hourly data can't pin a start to the minute, so every forecast time is
 * hedged; a sentence that sounds exact is where trust breaks when it's wrong.
 */
const around = (fmt: TimeFormatter, h: Hour) => `around ${fmt(h.time)}`;
const about = (fmt: TimeFormatter, h: Hour) => `about ${fmt(h.time)}`;

/**
 * The wet hours' peak chance, as " (70% chance)". Left off when rain is near
 * certain, where the figure adds nothing, and when an hour is wet only by its
 * measured amount, where "20% chance" next to "Rain" reads as a contradiction.
 */
export function chanceNote(hours: Hour[]): string {
  const peak = Math.max(0, ...hours.filter(isWet).map((h) => h.precipProb));
  return peak >= 40 && peak < 95 ? ` (${Math.round(peak)}% chance)` : '';
}

/** e.g. "showers from around 16:00", shared by the notification and commute notes. */
export function wetFrom(hours: Hour[], fmt: TimeFormatter = fmt24): string | undefined {
  const wet = firstWet(hours);
  return wet ? `${wetWord(hours)} from ${around(fmt, wet)}` : undefined;
}

/**
 * One plain-English sentence about rain across `hours`, e.g. "Dry until about
 * 15:00, then rain (70% chance)". Callers pass the rest of the day; the
 * sentence talks about "all day" only if the range runs to the evening. The
 * range's own end is exact, since it's ours rather than the forecast's.
 */
export function rainSummary(hours: Hour[], fmt: TimeFormatter = fmt24): string {
  if (!hours.length) return '';
  const wet = hours.map(isWet);
  const word = wetWord(hours);
  const end = hours[hours.length - 1];
  const toEvening = hourOf(end.time) >= 20 || end.time.slice(0, 10) !== hours[0].time.slice(0, 10);
  const span = toEvening ? 'all day' : `until ${fmt(end.time)}`;
  const chance = chanceNote(hours);

  if (!wet.some(Boolean)) return toEvening ? 'Dry all day' : `Dry ${span}`;
  if (wet.every(Boolean)) return `${cap(word)} ${span}${chance}`;

  const firstWetIdx = wet.indexOf(true);
  const firstDryIdx = wet.indexOf(false);

  if (firstWetIdx === 0) {
    const backIdx = wet.indexOf(true, firstDryIdx);
    const clears = about(fmt, hours[firstDryIdx]);
    if (backIdx < 0) return `${cap(word)} clearing by ${clears}`;
    return `${cap(word)} easing by ${clears}, back from ${around(fmt, hours[backIdx])}${chance}`;
  }

  const starts = hours[firstWetIdx];
  const dryAgainIdx = wet.indexOf(false, firstWetIdx);
  if (dryAgainIdx < 0) {
    // Showers come and go, so "dry until" would promise too much of the hours before.
    if (word === 'showers') return `Showers from ${around(fmt, starts)}${chance}`;
    return `Dry until ${about(fmt, starts)}, then ${word}${chance}`;
  }
  const anotherIdx = wet.indexOf(true, dryAgainIdx);
  if (anotherIdx < 0) {
    return `${cap(word)} from ${around(fmt, starts)} to ${fmt(hours[dryAgainIdx].time)}, otherwise dry${chance}`;
  }
  return `On and off ${word} from ${around(fmt, starts)}${chance}`;
}
