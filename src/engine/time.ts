// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

export type TimeFormatter = (localIso: string) => string;

/** Hour of a local ISO timestamp, read straight from the string. */
export function hourOf(localIso: string): number {
  return Number(localIso.slice(11, 13));
}

export function dateOf(localIso: string): string {
  return localIso.slice(0, 10);
}

export const fmt24: TimeFormatter = (iso) => iso.slice(11, 16);

export const fmt12: TimeFormatter = (iso) => {
  const h = hourOf(iso);
  const m = iso.slice(14, 16);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === '00' ? `${h12}${suffix}` : `${h12}:${m}${suffix}`;
};

/**
 * Current wall-clock time at a place, as a local ISO string. Built from the
 * UTC offset the forecast reports so it agrees with the forecast's own clock
 * whatever the device's time zone is.
 */
export function localNow(utcOffsetSeconds: number, now: number = Date.now()): string {
  return new Date(now + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}
