// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { ACTIVITY_LABEL } from '../engine/activity';
import { hourUtci } from '../engine/science/hourly';
import type { UtciCategory, WeatherPlace } from '../engine/science/types';
import type { ScienceWhy } from '../engine/science/why';
import type { Activity, Advice, Hour } from '../engine/types';
import type { TimeFormatter } from '../engine/time';
import { fmtDressFor, fmtTemp, tempDelta, type TempUnit } from './units';

/** Below this Tmrt − ta (K) the sun or sky is not worth a mention (thermal-model §9.3). */
export const RADIANT_MENTION = 2;
/** Wind's share of the outfit's warmth worth a mention (thermal-model §9.3). */
export const WIND_LOSS_MENTION = 0.15;
/** Body heat (W/m²) from which the activity clearly lowers what you need: above a brisk walk (about 157). */
export const WARMING_HEAT = 200;
/** Body heat (W/m²) at or below which you make little heat: standing or sitting about. */
export const IDLE_HEAT = 90;

/** How it feels, in one or two plain words, for the lead sentence. */
const PLAIN: Record<UtciCategory, string> = {
  'extreme-cold': 'dangerously cold',
  'very-strong-cold': 'very cold',
  'strong-cold': 'very cold',
  'moderate-cold': 'cold',
  'slight-cold': 'chilly',
  none: 'comfortable',
  'moderate-heat': 'warm',
  'strong-heat': 'hot',
  'very-strong-heat': 'very hot',
  'extreme-heat': 'dangerously hot',
};

/** The UTCI Assessment Scale's own names, as supporting detail. */
export const STRESS_LABEL: Record<UtciCategory, string> = {
  'extreme-cold': 'Extreme cold stress',
  'very-strong-cold': 'Very strong cold stress',
  'strong-cold': 'Strong cold stress',
  'moderate-cold': 'Moderate cold stress',
  'slight-cold': 'Slight cold stress',
  none: 'No heat or cold stress',
  'moderate-heat': 'Moderate heat stress',
  'strong-heat': 'Strong heat stress',
  'very-strong-heat': 'Very strong heat stress',
  'extreme-heat': 'Extreme heat stress',
};

export const CLO_NOTE = 'Clo is a unit of clothing warmth. A business suit is about 1 clo.';

/** Targets are rounded to 0.05 inside the engine; people read one decimal. */
export function fmtClo(clo: number): string {
  return `${(Math.round(clo * 10) / 10).toFixed(1)} clo`;
}

function signedClo(clo: number): string {
  const v = Math.round(clo * 10) / 10;
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)} clo`;
}

function minutes(m: number): string {
  if (m < 90) return `${Math.round(m)} min`;
  const h = Math.round(m / 30) / 2;
  return `${h} h`;
}

const usable = (n: number) => Number.isFinite(n);

/**
 * The feels-like range to show beside the real temperature: UTCI when the
 * science engine produced the advice, apparent temperature otherwise.
 */
export function feelsRange(a: Advice): { min: number; max: number } {
  const f = a.science?.feels;
  return f && usable(f.min) && usable(f.max) ? f : { min: a.minFeels, max: a.maxFeels };
}

export interface HeroReading {
  /** Drives the circle's colour, °C. */
  value: number;
  text: string;
  /** Read before the number by screen readers. */
  label: 'Feels like' | 'Dress for';
}

/**
 * The big number under the poster. With the science engine it is the coldest
 * hour's UTCI, the same number and rounding "Why this?" opens with; the bands
 * keep their dress-for temperature.
 */
export function heroReading(a: Advice, u: TempUnit): HeroReading {
  const r = a.science?.utci;
  if (r && !r.outOfRange && usable(r.utci)) return { value: r.utci, text: fmtTemp(r.utci, u), label: 'Feels like' };
  return { value: a.effective, text: fmtDressFor(a.effective, u), label: 'Dress for' };
}

/**
 * Feels-like for each strip hour: UTCI when the science engine produced the
 * advice, apparent temperature otherwise. Null where UTCI has no trustworthy
 * number, so the strip never shows an invented one.
 */
export function hourlyFeels(hours: Hour[], a: Advice, place: WeatherPlace): (number | null)[] {
  if (!a.science) return hours.map((h) => h.feels);
  return hours.map((h) => {
    const r = hourUtci(h, place);
    return r.outOfRange || !usable(r.utci) ? null : r.utci;
  });
}

/**
 * The plain-words answer that opens "Why this?": how it will feel, then what
 * the activity does about it. No units beyond degrees, no clo.
 */
export function scienceLead(s: ScienceWhy, u: TempUnit, fmt: TimeFormatter): string {
  const at = fmt(s.coldestHour);
  const feel = s.utci.outOfRange || !usable(s.utci.utci)
    ? `At ${at} it will be too hot and humid to put a number on.`
    : `At its coldest, ${at}, it will feel like ${fmtTemp(s.utci.utci, u)}: ${PLAIN[s.utci.category]}.`;
  const cold = s.utci.category.endsWith('cold');
  let body = '';
  if (!cold) body = s.utci.category === 'none' ? '' : ' Wear as little as you can and keep out of the sun.';
  else if (s.metabolic.ride > 0) body = ' Riding makes heat, but the air rushing past takes it away.';
  else if (s.metabolic.m >= WARMING_HEAT) body = ' Moving hard makes heat, so you need less than on a walk.';
  else if (s.metabolic.m <= IDLE_HEAT) body = ' Standing about makes little heat, so you need more than on a walk.';
  return feel + body;
}

export interface WhyRow {
  label: string;
  value: string;
  sub?: string;
}

export interface ScienceDetail {
  weather: WhyRow[];
  you: WhyRow[];
  warmth: WhyRow[];
  /** Plain sentences under the warmth rows. */
  warmthNotes: string[];
  /** Why the numbers are less sure than usual. */
  caveats: string[];
}

/** The supporting numbers behind the lead (thermal-model §9.3). */
export function scienceDetail(s: ScienceWhy, activity: Activity, u: TempUnit, fmt: TimeFormatter): ScienceDetail {
  const d = s.tmrtDelta;
  const radiant = s.radiation === 'none' || Math.abs(d) <= RADIANT_MENTION
    ? undefined
    : d > 0
      ? `Sun adds ${Math.round(tempDelta(d, u))}°`
      : `Clear sky takes ${Math.round(tempDelta(-d, u))}°`;
  const number = s.utci.outOfRange || !usable(s.utci.utci);
  const weather: WhyRow[] = [
    {
      label: 'Feels like',
      value: number ? `${STRESS_LABEL[s.utci.category]} at ${fmt(s.coldestHour)}` : `${fmtTemp(s.utci.utci, u)} at ${fmt(s.coldestHour)}`,
      sub: 'UTCI, which counts wind, sun and damp air',
    },
    { label: 'Actual temperature', value: fmtTemp(s.ta, u), sub: 'at the same hour' },
  ];
  if (!number) weather.push({ label: 'Strain on your body', value: STRESS_LABEL[s.utci.category], sub: radiant });
  else if (radiant) weather.push({ label: 'Sun and sky', value: radiant });

  const you: WhyRow[] = [
    { label: `${ACTIVITY_LABEL[activity]}, ${minutes(s.exposureMinutes)} outside`, value: `${Math.round(s.metabolic.m)} W/m²`, sub: 'body heat you make' },
    {
      label: 'Your adjustment',
      value: signedClo(s.target.bias),
      sub: s.biasCount > 0 ? `from ${s.biasCount} rating${s.biasCount === 1 ? '' : 's'}` : 'no ratings yet',
    },
  ];

  const warmth: WhyRow[] = [{ label: 'Needs about', value: fmtClo(s.target.icl) }];
  const warmthNotes: string[] = [];
  if (s.outfit) {
    warmth.push({ label: 'This outfit gives', value: fmtClo(s.outfit.basic) });
    if (s.outfit.windLoss > WIND_LOSS_MENTION) warmthNotes.push(`Wind takes ${Math.round(s.outfit.windLoss * 100)}% off this outfit’s warmth.`);
  }

  const caveats: string[] = [];
  if (s.target.basis === 'ireq-extended' || s.utci.clamped) caveats.push('Outside the standard’s tested range, so this is an estimate.');
  if (s.radiation === 'estimated') caveats.push('Sunshine estimated from cloud cover.');
  if (s.radiation === 'none') caveats.push('No sunshine data, so the sun isn’t counted.');
  return { weather, you, warmth, warmthNotes, caveats };
}
