// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { ScienceWhy } from '../../engine/science/why';

/** The London golden day (3 °C, 25 km/h, showers) as the science engine words it, for UI tests. */
export function londonWhy(over: Partial<ScienceWhy> = {}): ScienceWhy {
  return {
    coldestHour: '2026-11-26T08:00',
    ta: 3,
    utci: { utci: -3.2, category: 'moderate-cold', clamped: false, outOfRange: false },
    tmrtDelta: -1,
    radiation: 'forecast',
    feels: { min: -3.2, max: 0.6 },
    metabolic: { m: 157.5, w: 0, walk: 1.2, ride: 0, clampedM: false },
    exposureMinutes: 30,
    target: { icl: 1.3, floor: 1.2, neutral: 1.45, bias: 0.1, exposureHours: 0.5, basis: 'ireq' },
    outfit: { basic: 1.38, windLoss: 0.25 },
    biasCount: 14,
    ...over,
  };
}
