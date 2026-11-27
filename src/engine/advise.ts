// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { effortOffset } from './activity';
import { BANDS, bandFor } from './bands';
import { extrasFor, windowStats } from './extras';
import { comfortOffset as comfortOffsetFor, type ComfortProfile } from './comfort';
import type { GarmentWarmth } from './garment-learning';
import { ownership, type Inventory } from './inventory';
import { learnedFor, learnedFromSnapshot, type LearnSnapshot } from './learning';
import { matchInventory, withoutCovered } from './match';
import { requirementsFor } from './requirements';
import { scienceWhy } from './science/advice';
import type { WeatherPlace } from './science/types';
import { hourToWeather } from './science/weather';
import type { Activity, Advice, Effort, Hour, Rating } from './types';

export interface AdviseInput {
  hours: Hour[];
  activity: Activity;
  /** Only changes running, cycling and hiking; missing means steady. */
  effort?: Effort;
  /** Manual offset from Settings, °C. Positive means "I run warm". */
  manualOffset?: number;
  ratings?: Rating[];
  /** The votes' pull as a snapshot; when set it stands in for `ratings`, so the Worker learns without the votes. */
  learned?: LearnSnapshot;
  /** Local date used to age ratings. */
  today?: string;
  /** Category inventory; `{}` or missing gives generic advice. */
  inventory?: Inventory;
  comfort?: ComfortProfile;
  /** Learned garment warmth (US-039); missing means none learned. */
  garmentWarmth?: GarmentWarmth;
  /** Set to dress from the thermal model's clothing target (engine 'science'); missing keeps the bands. */
  science?: AdviseScience;
}

export interface AdviseScience {
  place: WeatherPlace;
  /** Personal insulation bias, clo. */
  bias: number;
  /** Ratings behind `bias`, for "Why this?". */
  biasCount: number;
  /** Hours outside; missing means the whole window. */
  exposureHours?: number;
}

/**
 * Whether `a` calls for warmer clothes than `b`. Both come from the same
 * engine: the science engine compares clothing targets, the bands compare
 * effective temperatures.
 */
export function colderThan(a: Advice, b: Advice): boolean {
  const ca = a.requirements?.clo?.icl;
  const cb = b.requirements?.clo?.icl;
  return ca !== undefined && cb !== undefined ? ca > cb : a.effective < b.effective;
}

/**
 * UTCI range across several pieces of science advice, so a merged day reads
 * its whole span. A leg without a finite UTCI is left out: one NaN would
 * otherwise send the whole day back to apparent temperature.
 */
export function mergedScience(cold: Advice, all: Advice[]): Advice['science'] {
  if (!cold.science) return undefined;
  const ranges = all.flatMap((a) => (a.science && Number.isFinite(a.science.feels.min) && Number.isFinite(a.science.feels.max) ? [a.science.feels] : []));
  if (!ranges.length) return cold.science;
  return { ...cold.science, feels: { min: Math.min(...ranges.map((r) => r.min)), max: Math.max(...ranges.map((r) => r.max)) } };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function advise(input: AdviseInput): Advice | null {
  const { hours, activity } = input;
  if (!hours.length) return null;

  // Dress for the coldest hour; a warm afternoon can't help a cold morning.
  let coldest = hours[0];
  for (const h of hours) if (h.feels < coldest.feels) coldest = h;
  const maxFeels = Math.max(...hours.map((h) => h.feels));

  const manualOffset = input.manualOffset ?? 0;
  const activityOffset = effortOffset(activity, input.effort);
  const today = input.today ?? hours[0].time.slice(0, 10);
  const learned = input.learned ? learnedFromSnapshot(input.learned, activity, today) : learnedFor(input.ratings ?? [], activity, today);
  const comfortOffset = input.comfort ? comfortOffsetFor(input.comfort, activity) : 0;
  const effective = round1(coldest.feels + activityOffset + comfortOffset + manualOffset + learned.offset);

  const stats = windowStats(hours);
  const extras = extrasFor(stats, effective, activity);

  const inventory = input.inventory ?? {};
  const sci = input.science;
  const science = sci && { weather: hours.map((h) => hourToWeather(h, sci.place)), exposureHours: sci.exposureHours ?? hours.length, bias: sci.bias };
  const requirements = requirementsFor({ effective, band: bandFor(effective).id, stats, extras, activity, comfort: input.comfort, effort: input.effort, science });
  const band = BANDS.find((b) => b.id === requirements.band)!;
  const { layers, limitations, alternatives } = matchInventory(requirements, inventory, input.garmentWarmth);
  // An umbrella the user has said they don't own is no use as advice.
  const finalExtras = withoutCovered(ownership(inventory, 'umbrella') === 'none' ? extras.filter((e) => e.id !== 'umbrella') : extras, layers, inventory);

  const rules = [
    requirements.clo ? `Needs about ${requirements.clo.icl.toFixed(1)} clo, the “${band.verdict}” band` : `Effective ${effective}° is in the “${band.verdict}” band`,
    ...finalExtras.map((e) => `${e.label}: ${e.reason}`)];

  return {
    requirements,
    limitations,
    alternatives,
    band: band.id,
    verdict: band.verdict,
    summary: band.summary,
    effective,
    minFeels: round1(coldest.feels),
    maxFeels: round1(maxFeels),
    layers,
    extras: finalExtras,
    hours,
    why: {
      coldestHour: coldest.time,
      coldestFeels: round1(coldest.feels),
      activity,
      activityOffset,
      comfortOffset,
      manualOffset,
      learnedOffset: learned.offset,
      learnedFrom: learned.from,
      effective,
      band: band.id,
      rules,
    },
    ...(science && requirements.clo
      ? {
          science: scienceWhy({
            hours,
            science,
            target: requirements.clo,
            activity,
            effort: input.effort,
            layers,
            inventory,
            stats,
            biasCount: sci.biasCount,
          }),
        }
      : {}),
  };
}
