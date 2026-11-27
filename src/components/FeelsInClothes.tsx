// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import '../styles/feels-in-clothes.css';
import type { Advice } from '../engine/types';
import type { WeatherPlace } from '../engine/science/types';
import { feelsInClothes } from '../data/feels-in-clothes';

/**
 * #85 prototype, behind the `feels-in-clothes` flag: how long the chosen
 * outfit keeps you warm. The words carry the message; the edge colour only
 * repeats it.
 */
export function FeelsInClothes({ advice, place }: { advice: Advice; place: WeatherPlace }) {
  const l = feelsInClothes(advice, place);
  if (!l) return null;
  return (
    <p class="clothes-line" data-tone={l.tone}>
      <strong>{l.line}</strong> <span class="clothes-sub">{l.sub}</span>
    </p>
  );
}
