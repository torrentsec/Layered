// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { effortOffset } from './activity';
import { bandFor } from './bands';
import { extrasFor, windowStats } from './extras';
import { comfortOffset as comfortOffsetFor, type ComfortProfile } from './comfort';
import type { GarmentWarmth } from './garment-learning';
import { ownership, type Inventory } from './inventory';
import { learnedFor } from './learning';
import { matchInventory, withoutCovered } from './match';
import { requirementsFor } from './requirements';
import type { Activity, Advice, Effort, Hour, Rating } from './types';

export interface AdviseInput {
  hours: Hour[];
  activity: Activity;
  /** Only changes running, cycling and hiking; missing means steady. */
  effort?: Effort;
  /** Manual offset from Settings, °C. Positive means "I run warm". */
  manualOffset?: number;
  ratings?: Rating[];
  /** Local date used to age ratings. */
  today?: string;
  /** Category inventory; `{}` or missing gives generic advice. */
  inventory?: Inventory;
  comfort?: ComfortProfile;
  /** Learned garment warmth (US-039); missing means none learned. */
  garmentWarmth?: GarmentWarmth;
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
  const learned = learnedFor(input.ratings ?? [], activity, input.today ?? hours[0].time.slice(0, 10));
  const comfortOffset = input.comfort ? comfortOffsetFor(input.comfort, activity) : 0;
  const effective = round1(coldest.feels + activityOffset + comfortOffset + manualOffset + learned.offset);

  const band = bandFor(effective);
  const stats = windowStats(hours);
  const extras = extrasFor(stats, effective, activity);

  const inventory = input.inventory ?? {};
  const requirements = requirementsFor({ effective, band: band.id, stats, extras, activity, comfort: input.comfort });
  const { layers, limitations, alternatives } = matchInventory(requirements, inventory, input.garmentWarmth);
  // An umbrella the user has said they don't own is no use as advice.
  const finalExtras = withoutCovered(ownership(inventory, 'umbrella') === 'none' ? extras.filter((e) => e.id !== 'umbrella') : extras, layers, inventory);

  const rules = [`Effective ${effective}° is in the “${band.verdict}” band`, ...finalExtras.map((e) => `${e.label}: ${e.reason}`)];

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
  };
}
