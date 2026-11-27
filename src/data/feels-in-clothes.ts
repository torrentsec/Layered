// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

/**
 * "Feels like in what you wear" (#85, Sprint 7 prototype): how long the chosen
 * outfit keeps you warm, said in minutes, instead of asking people to turn a
 * feels-like temperature into clothes themselves.
 */

import { comfortTime, type ComfortTime } from '../engine/science/comfort-time';
import { BAND_PLAN_CLO } from '../engine/science/target';
import type { WeatherPlace } from '../engine/science/types';
import { hourToWeather } from '../engine/science/weather';
import type { Advice } from '../engine/types';
import { outerText } from './advice-text';
import { fmtMinutes } from './why-science';

export interface ClothesLine {
  line: string;
  sub: string;
  /** covered: warm the whole time; cool: a little cool by the end; cold: more than mild discomfort. */
  tone: 'covered' | 'cool' | 'cold';
  time: ComfortTime;
}

/** Below this a time is said as "under 10 min": the model is not that precise. */
export const SHORTEST_MIN = 10;

/**
 * Rounded down, so the line never promises warmth the model doesn't give:
 * to 10 min under 90, then to half hours.
 */
export function fmtWarmFor(minutes: number): string {
  if (minutes < SHORTEST_MIN) return `under ${SHORTEST_MIN} min`;
  const m = minutes < 90 ? Math.floor(minutes / 10) * 10 : Math.floor(minutes / 30) * 30;
  return `about ${fmtMinutes(m)}`;
}

/** The outer layer when it came from the wardrobe; the outfit as a whole otherwise. */
function whose(a: Advice): string {
  const outer = a.layers.find((l) => l.kind === 'outer' && !l.optional);
  const text = outer?.owned === 'owned' ? outerText(a.layers) : undefined;
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : 'this outfit';
}

/**
 * The line for science advice on a cold or cool day. Undefined for the bands
 * and on warm days, where the question is overheating, not how long warmth lasts.
 * The outfit's own ISO 9920 sum is used when the layers could be summed, else
 * the band's plan, which is what generic advice stands for.
 */
export function feelsInClothes(a: Advice, place: WeatherPlace): ClothesLine | undefined {
  const s = a.science;
  if (!s || s.target.basis === 'heat-ladder' || !a.hours.length) return undefined;
  const time = comfortTime({
    hours: a.hours.map((h) => hourToWeather(h, place)),
    metabolic: s.metabolic,
    worn: s.outfit?.basic ?? BAND_PLAN_CLO[a.band],
    bias: s.target.bias,
  });
  if (!time) return undefined;

  const out = s.exposureMinutes;
  const sub = `You’re out for ${fmtMinutes(out)}.`;
  const who = whose(a);
  const warm = time.warm * 60;
  const bearable = time.bearable * 60;
  if (!Number.isFinite(warm)) return { line: `Warm enough in ${who} all day.`, sub, tone: 'covered', time };
  if (warm >= out) return { line: `Warm enough in ${who} for ${fmtWarmFor(warm)}.`, sub, tone: 'covered', time };
  if (bearable >= out) return { line: `Warm in ${who} for ${fmtWarmFor(warm)}, then a little cool.`, sub, tone: 'cool', time };
  return {
    line: `Warm in ${who} for ${fmtWarmFor(warm)}, cold after ${fmtWarmFor(bearable)}.`,
    sub: `${sub} Add a layer or warm up indoors on the way.`,
    tone: 'cold',
    time,
  };
}
