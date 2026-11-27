// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { notificationText } from '../../src/engine/notify';
import type { Advice, BandId, ExtraId, Hour } from '../../src/engine';
import { biasPrior } from '../../src/engine/science/personal';
import type { Forecast } from '../../src/data/forecast-types';
import { planDayFor, type PlanInput } from '../../src/data/day-plan';
import { engineOf } from '../../src/data/engine-choice';
import { timeFmt } from '../../src/data/format';
import type { PushProfile } from '../../src/data/push-api';

/**
 * The app's own planner, `planDayFor`, fed from the push profile instead of
 * the device: the same engine, place, time outside, bias, vote pull and
 * routines. Only the inventory and learned garment warmth stay on the device;
 * they change which garments are named, never the band or the extras a
 * notification reads.
 */

/** Settings' default time outside, for subscriptions saved before the profile carried it. */
export const DEFAULT_DURATION = 5;

export interface Plan {
  advice: Advice;
  /** The rest of the day, for the rain clause. */
  dayHours: Hour[];
}

export function planInput(p: PushProfile, today: boolean): PlanInput {
  return {
    engine: engineOf(p),
    units: p.units,
    activity: p.activity,
    duration: p.duration ?? DEFAULT_DURATION,
    commute: p.commute,
    manualOffset: p.manualOffset,
    ...(p.learned ? { learned: p.learned } : {}),
    comfort: p.comfort,
    // Without the device's number, the same starting point the device had before any vote.
    bias: p.bias !== undefined ? { mean: p.bias, count: p.biasCount ?? 0 } : biasPrior(p.comfort, p.manualOffset),
    // Today plans with routines, other days without, as Today and the Week do.
    ...(today && p.routines?.length ? { routines: p.routines.map((r, i) => ({ ...r, id: `r${i}`, name: '' })) } : {}),
  };
}

export function planFor(f: Forecast, date: string, p: PushProfile, nowLocal: string): Plan | null {
  const plan = planDayFor(f, date, planInput(p, nowLocal.startsWith(date)), nowLocal);
  return plan && { advice: plan.advice, dayHours: plan.dayHours };
}

export function bodyFor(plan: Plan, p: PushProfile, day: 'today' | 'tomorrow'): string {
  return notificationText(plan.advice, plan.dayHours, timeFmt(p.units.clock), day);
}

/** What the morning push promised, kept so a later run can tell whether it still holds. */
export interface Summary {
  date: string;
  /** Local time the morning advice was computed for; re-checks use the same window. */
  at: string;
  band: BandId;
  rain: ExtraId[];
}

export function summarise(advice: Advice, date: string, at: string): Summary {
  const rain = advice.extras.filter((e) => e.tone === 'rain').map((e) => e.id).sort();
  return { date, at, band: advice.band, rain };
}

/** Material means a different band or different rain gear; cold-weather extras follow the band anyway. */
export function changed(a: Summary, b: Summary): boolean {
  return a.band !== b.band || a.rain.join() !== b.rain.join();
}

export function parseSummary(raw: string | null): Summary | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Summary;
    return typeof s?.date === 'string' && typeof s.at === 'string' && typeof s.band === 'string' && Array.isArray(s.rain) ? s : null;
  } catch {
    return null;
  }
}
