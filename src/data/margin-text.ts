// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { BANDS } from '../engine/bands';
import { bandMargin, MARGIN_MAX, type BandMargin, type Tip } from '../engine/science/margin';
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
  /** Only the directions that change the advice within the search reach. */
  rows: WhyRow[];
  /** Set when a direction holds past the reach, e.g. "Same advice even 9° colder." */
  steady?: string;
  /** A shift of one degree in the reader's unit changes the advice. */
  close: boolean;
  /** A shift of `MARGIN_SHOW_DEGREES` or less changes the advice: the only time the section earns its place. */
  show: boolean;
}

/** Judged on the degrees the reader sees, so the close note holds in °F too. */
export const MARGIN_CLOSE_DEGREES = 1;
/** The section shows only when this many degrees (reader's unit) or fewer would change the advice. */
export const MARGIN_SHOW_DEGREES = 2;

export function marginText(m: BandMargin, u: TempUnit): MarginText {
  const tips = (['warmer', 'colder'] as const).flatMap((dir) => {
    const t = m[dir];
    return t ? [{ dir, n: degrees(t.by, u), t }] : [];
  });
  const rows = tips.map(({ dir, n, t }) => ({ label: `${n}° ${dir}`, value: verdict(t) }));
  const max = degrees(MARGIN_MAX, u);
  const held = (['warmer', 'colder'] as const).filter((dir) => !m[dir]);
  const steady = held.length === 2 ? `Same advice within ${max}° either way.` : held.length === 1 ? `Same advice even ${max}° ${held[0]}.` : undefined;
  return { rows, ...(steady ? { steady } : {}), close: tips.some((x) => x.n <= MARGIN_CLOSE_DEGREES), show: tips.some((x) => x.n <= MARGIN_SHOW_DEGREES) };
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
