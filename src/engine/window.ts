// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Hour } from './types';

/** Index of the hour containing `localIso`, or -1. */
export function hourIndex(hours: Hour[], localIso: string): number {
  const key = localIso.slice(0, 13);
  return hours.findIndex((h) => h.time.slice(0, 13) === key);
}

/**
 * The hours someone is outside, starting with the hour that contains
 * `startIso`. A start that falls before the forecast begins is clamped to the
 * first hour rather than producing an empty window.
 */
export function selectWindow(hours: Hour[], startIso: string, durationHours: number): Hour[] {
  let start = hourIndex(hours, startIso);
  if (start < 0) {
    if (hours.length && startIso < hours[0].time) start = 0;
    else return [];
  }
  return hours.slice(start, start + Math.max(1, Math.round(durationHours)));
}

/** Window for a leg given as "HH:MM" on a given local date. */
export function legWindow(hours: Hour[], date: string, hhmm: string, durationHours: number): Hour[] {
  return selectWindow(hours, `${date}T${hhmm}`, durationHours);
}
