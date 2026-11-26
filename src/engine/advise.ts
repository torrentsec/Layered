// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { ACTIVITY_OFFSET } from './activity';
import { bandFor } from './bands';
import { extrasFor, windowStats } from './extras';
import { learnedFor } from './learning';
import type { Activity, Advice, Hour, Rating, WardrobeItem } from './types';
import { applyWardrobe } from './wardrobe';

export interface AdviseInput {
  hours: Hour[];
  activity: Activity;
  /** Manual offset from Settings, °C. Positive means "I run warm". */
  manualOffset?: number;
  ratings?: Rating[];
  /** Local date used to age ratings. */
  today?: string;
  wardrobe?: WardrobeItem[];
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
  const activityOffset = ACTIVITY_OFFSET[activity];
  const learned = learnedFor(input.ratings ?? [], activity, input.today ?? hours[0].time.slice(0, 10));
  const effective = round1(coldest.feels + activityOffset + manualOffset + learned.offset);

  const band = bandFor(effective);
  const stats = windowStats(hours);
  const extras = extrasFor(stats, effective, activity);

  const { layers, extras: finalExtras } = applyWardrobe(band.id, band.layers, extras, input.wardrobe ?? [], {
    wet: extras.some((e) => e.id === 'waterproof' || e.id === 'hood' || e.id === 'umbrella'),
    windy: stats.maxWind > 25 || stats.maxGust > 40,
  });

  const rules = [`Effective ${effective}° is in the “${band.verdict}” band`, ...finalExtras.map((e) => `${e.label}: ${e.reason}`)];

  return {
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
      manualOffset,
      learnedOffset: learned.offset,
      learnedFrom: learned.from,
      effective,
      band: band.id,
      rules,
    },
  };
}
