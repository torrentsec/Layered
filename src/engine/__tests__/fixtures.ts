// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Hour } from '../types';

export function hour(time: string, over: Partial<Hour> = {}): Hour {
  return {
    time,
    temp: 12,
    feels: 12,
    precipProb: 0,
    precip: 0,
    snow: 0,
    wind: 10,
    gusts: 15,
    uv: 0,
    isDay: true,
    code: 1,
    ...over,
  };
}

/** Consecutive hours from `start` ("HH") on 2026-11-26, each overridden by `over(i)`. */
export function day(count: number, over: (i: number) => Partial<Hour> = () => ({}), start = 8, date = '2026-11-26'): Hour[] {
  return Array.from({ length: count }, (_, i) => {
    const h = start + i;
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCHours(h);
    return hour(d.toISOString().slice(0, 16), over(i));
  });
}
