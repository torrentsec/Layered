// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { BandId, LayerAdvice } from './types';

// below this, no amount of optimism keeps you warm
export const TORRENTSEC_THRESHOLD_C = 2;

interface Band {
  id: BandId;
  /** Inclusive lower bound of the effective temperature. */
  min: number;
  verdict: string;
  summary: string;
  layers: LayerAdvice[];
}

// Ordered warmest first so the first match wins.
export const BANDS: readonly Band[] = [
  {
    id: 'tshirt',
    min: 22,
    verdict: 'T-shirt weather',
    summary: 'Just a T-shirt.',
    layers: [{ kind: 'base', label: 'T-shirt' }],
  },
  {
    id: 'light',
    min: 17,
    verdict: 'Light layer optional',
    summary: 'A T-shirt, with a light layer if you feel the cold.',
    layers: [
      { kind: 'base', label: 'T-shirt' },
      { kind: 'mid', label: 'Light layer', optional: true },
    ],
  },
  {
    id: 'two',
    min: 12,
    verdict: 'Two light layers',
    summary: 'A base layer and a light top over it.',
    layers: [
      { kind: 'base', label: 'Long-sleeve top' },
      { kind: 'mid', label: 'Light jumper or overshirt' },
    ],
  },
  {
    id: 'jacket',
    min: 7,
    verdict: 'Jacket on',
    summary: 'Base layer, jumper and a jacket.',
    layers: [
      { kind: 'base', label: 'Base layer' },
      { kind: 'mid', label: 'Jumper' },
      { kind: 'outer', label: 'Jacket' },
    ],
  },
  {
    id: 'coat',
    min: TORRENTSEC_THRESHOLD_C,
    verdict: 'Coat on',
    summary: 'Base layer, jumper and a warm coat.',
    layers: [
      { kind: 'base', label: 'Base layer' },
      { kind: 'mid', label: 'Jumper' },
      { kind: 'outer', label: 'Warm coat' },
    ],
  },
  {
    id: 'bundle',
    min: -Infinity,
    verdict: 'Bundle up',
    summary: 'Thermal base, thick jumper and a heavy coat.',
    layers: [
      { kind: 'base', label: 'Thermal base layer' },
      { kind: 'mid', label: 'Thick jumper' },
      { kind: 'outer', label: 'Heavy coat' },
    ],
  },
];

export function bandFor(effective: number): Band {
  return BANDS.find((b) => effective >= b.min) ?? BANDS[BANDS.length - 1];
}

/** Higher is colder; handy for comparing two legs or the days of a trip. */
export function bandRank(id: BandId): number {
  return BANDS.findIndex((b) => b.id === id);
}
