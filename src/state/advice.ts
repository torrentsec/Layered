// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { localNow } from '../engine/time';
import type { Activity, Effort, Hour } from '../engine/types';
import type { Forecast } from '../data/forecast-types';
import { garmentWarmth, type Routine, type Settings } from '../data/store';
import { biasState } from '../data/bias';
import { planDayFor, type DayPlan } from '../data/day-plan';
import type { GarmentWarmth } from '../engine/garment-learning';
import type { Rating } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import type { ComfortProfile } from '../engine/comfort';
import type { BiasState } from '../engine/science/types';

export type { DayPlan } from '../data/day-plan';

interface Ctx {
  settings: Settings;
  ratings: Rating[];
  inventory: Inventory;
  comfort: ComfortProfile;
  activity?: Activity;
  effort?: Effort;
  duration?: number;
  commute?: boolean;
  /** Saved routines; those scheduled on `date` become extra legs (US-066). */
  routines?: Routine[];
  /** Defaults to the persisted learned warmth, so every screen dresses you the same way. */
  garmentWarmth?: GarmentWarmth;
  /** Personal insulation bias for the science engine; defaults to the persisted one. */
  bias?: Pick<BiasState, 'mean' | 'count'>;
}

/**
 * The day's advice from what this device knows. The planning itself is
 * `planDayFor`, which the push Worker shares, so a notification and Today
 * can't tell different stories.
 */
export function planDay(f: Forecast, date: string, ctx: Ctx): DayPlan | null {
  const s = ctx.settings;
  return planDayFor(
    f,
    date,
    {
      engine: s.engine === 'science' ? 'science' : 'bands',
      units: s.units,
      activity: ctx.activity ?? s.activity,
      effort: ctx.effort,
      duration: ctx.duration ?? s.duration,
      commute: s.commute,
      commuteOn: ctx.commute,
      manualOffset: s.manualOffset,
      ratings: ctx.ratings,
      inventory: ctx.inventory,
      comfort: ctx.comfort,
      garmentWarmth: ctx.garmentWarmth ?? garmentWarmth.value,
      bias: ctx.bias ?? biasState(),
      routines: ctx.routines,
    },
    localNow(f.utcOffsetSeconds),
  );
}

/** The rest of the local day, for the rain sentence. */
export function restOfDay(hours: Hour[], date: string): Hour[] {
  return hours.filter((h) => h.time.startsWith(date));
}
