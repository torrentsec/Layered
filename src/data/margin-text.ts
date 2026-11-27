// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { BANDS } from '../engine/bands';
import { bandMargin, isClose, MARGIN_MAX, type BandMargin, type Tip } from '../engine/science/margin';
import type { WeatherPlace } from '../engine/science/types';
import { hourToWeather } from '../engine/science/weather';
import type { Advice, Effort } from '../engine/types';
import { tempDelta, type TempUnit } from './units';
import type { WhyRow } from './why-science';

export const MARGIN_TITLE = 'What would change this';
export const MARGIN_INTRO = 'If the forecast is out by a few degrees:';
export const MARGIN_CLOSE_NOTE = 'A one-degree forecast miss would change this, so check again before you go.';

/**
 * Whole degrees in the reader's unit, rounded up: the shift that changes the
 * advice is at most this, and "0.5°" reads as false precision.
 */
function degrees(k: number, u: TempUnit): number {
  return Math.max(1, Math.ceil(tempDelta(k, u) - 1e-9));
}

const verdict = (t: Tip) => BANDS.find((b) => b.id === t.band)!.verdict;

export interface MarginText {
  rows: WhyRow[];
  close: boolean;
}

export function marginText(m: BandMargin, u: TempUnit): MarginText {
  const row = (dir: 'warmer' | 'colder', t: Tip | undefined): WhyRow =>
    t ? { label: `${degrees(t.by, u)}° ${dir}`, value: verdict(t) } : { label: `${degrees(MARGIN_MAX, u)}° ${dir}`, value: 'No change' };
  return { rows: [row('warmer', m.warmer), row('colder', m.colder)], close: isClose(m) };
}

/**
 * The margin for advice the science engine produced. Undefined when the rerun
 * lands on a different band from the advice shown (a merged commute or a
 * hedged far-off day), since a margin from the wrong starting point misleads.
 */
export function adviceMargin(a: Advice, place: WeatherPlace, effort?: Effort): BandMargin | undefined {
  const t = a.science?.target;
  if (!t) return undefined;
  const m = bandMargin({ hours: a.hours.map((h) => hourToWeather(h, place)), activity: a.why.activity, effort, exposureHours: t.exposureHours, bias: t.bias });
  return m.band === a.band ? m : undefined;
}
