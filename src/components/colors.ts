// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Cold reads blue, mild reads paper-yellow, hot reads red: the poster primaries
// doubling as a thermometer.
const STOPS: [number, string][] = [
  [-10, '#16336b'],
  [0, '#1e4fa0'],
  [6, '#6f93cf'],
  [11, '#b9c4c9'],
  [15, '#e9d58c'],
  [19, '#f3bf1a'],
  [24, '#ef8a1c'],
  [29, '#e2332a'],
];

function lerp(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function tempColor(c: number): string {
  if (c <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (c <= t1) return lerp(c0, c1, (c - t0) / (t1 - t0));
  }
  return STOPS[STOPS.length - 1][1];
}

/** Text colour that stays readable on top of `tempColor(c)`. */
export function onTempColor(c: number): string {
  return c < 8 || c > 26 ? '#ffffff' : '#111111';
}
