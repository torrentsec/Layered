// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// The headline under the thermal model (shipped from spike #84): the real
// temperature first, with what it feels like and why underneath, so the number
// matches other apps and the model is never contradicted. Only the display
// changes; the clothing target still comes from IREQ.

import type { Advice } from '../engine/types';
import { fmtTemp, type TempUnit } from './units';
import { RADIANT_MENTION, heroReading } from './why-science';

/** From this wind, km/h, the wind is named as the reason it feels colder than the air. */
export const WIND_CAUSE = 10;

export interface CalibratedReading {
  /** Drives the circle's colour, °C: how it feels, as the clothing does. */
  value: number;
  text: string;
  /** Read before the number by screen readers. */
  label: string;
  /** One short line under the number; empty when there is nothing to add. */
  note: string;
  /** False when today's reading stands because UTCI has no number; the screen then keeps its old readout. */
  feelsFirst: boolean;
}

/**
 * The hero number and its note: the air temperature, then how it feels and
 * why. Without the science engine, or when UTCI has no number, today's
 * reading stands so the hero never invents a figure.
 */
export function calibratedReading(a: Advice, u: TempUnit): CalibratedReading {
  const plain = heroReading(a, u);
  const s = a.science;
  const r = s?.utci;
  if (!s || !r || r.outOfRange || !Number.isFinite(r.utci)) return { ...plain, note: '', feelsFirst: false };
  const hour = a.hours.find((h) => h.time === s.coldestHour);
  const colder = r.utci < s.ta;
  const cause = colder
    ? (hour && hour.wind >= WIND_CAUSE ? ' in the wind' : '')
    : s.tmrtDelta >= RADIANT_MENTION ? ' in the sun' : '';
  const same = fmtTemp(r.utci, u) === fmtTemp(s.ta, u);
  return { value: r.utci, text: fmtTemp(s.ta, u), label: 'Actual', note: same ? '' : `Feels ${fmtTemp(r.utci, u)}${cause}`, feelsFirst: true };
}
