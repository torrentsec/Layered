// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { adviseCommute, type CommuteAdvice } from '../engine/commute';
import { advise } from '../engine/advise';
import { adviseLegs, routineLegs, type Leg, type LegsAdvice, type RoutineSpec } from '../engine/routines';
import { legWindow, selectWindow, hourIndex } from '../engine/window';
import type { Activity, Advice, Effort, Hour, Rating } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import type { ComfortProfile } from '../engine/comfort';
import type { GarmentWarmth } from '../engine/garment-learning';
import type { LearnSnapshot } from '../engine/learning';
import type { BiasState, WeatherPlace } from '../engine/science/types';
import type { Forecast } from './forecast-types';
import { timeFmt, weekday } from './format';
import { fmtTemp, type Units } from './units';
import type { Commute } from './store';

export interface DayPlan {
  advice: Advice;
  commute?: CommuteAdvice;
  /** Set when routines join the day; replaces `commute`, whose legs it includes. */
  legs?: LegsAdvice;
  /** Hours for the strip and the rain sentence. */
  dayHours: Hour[];
  windowTimes: Set<string>;
}

/**
 * Everything that decides a day's advice, passed in rather than read from the
 * device, so the app and the push Worker plan with the same code and inputs.
 */
export interface PlanInput {
  engine: 'bands' | 'science';
  units: Pick<Units, 'temp' | 'clock'>;
  activity: Activity;
  effort?: Effort;
  /** Hours outside for the day window; also the science engine's exposure. */
  duration: number;
  commute: Commute;
  /** Overrides whether the commute applies (DayView's toggle); missing means its days decide. */
  commuteOn?: boolean;
  manualOffset: number;
  ratings?: Rating[];
  /** Stands in for `ratings` where the votes aren't available (the Worker). */
  learned?: LearnSnapshot;
  inventory?: Inventory;
  comfort?: ComfortProfile;
  garmentWarmth?: GarmentWarmth;
  bias: Pick<BiasState, 'mean' | 'count'>;
  /** Routines scheduled on the date become extra legs (US-066). */
  routines?: (RoutineSpec & { id: string })[];
}

type PlanForecast = Pick<Forecast, 'hours' | 'lat' | 'lon' | 'utcOffsetSeconds'>;

/** The place the science engine reads radiation and day length for. */
export const placeOf = (f: PlanForecast): WeatherPlace => ({ lat: f.lat, lon: f.lon, utcOffsetSeconds: f.utcOffsetSeconds });

/**
 * Builds the advice for one local date at local time `now`. Today starts from
 * the current hour; other days start at the commute's "out" time (or 08:00),
 * which is when people actually get dressed.
 */
export function planDayFor(f: PlanForecast, date: string, p: PlanInput, now: string): DayPlan | null {
  const activity = p.activity;
  const effort = p.effort;
  const isToday = now.startsWith(date);
  const fmt = timeFmt(p.units.clock);
  const science = p.engine === 'science' ? { place: placeOf(f), bias: p.bias.mean, biasCount: p.bias.count } : undefined;
  const shared = {
    manualOffset: p.manualOffset,
    ratings: p.ratings,
    ...(p.learned ? { learned: p.learned } : {}),
    today: now.slice(0, 10),
    inventory: p.inventory,
    comfort: p.comfort,
    garmentWarmth: p.garmentWarmth,
    ...(science ? { science } : {}),
  };
  const base = { ...shared, activity, effort };
  const hourNow = now.slice(0, 13);
  const live = (hs: Hour[]) => !isToday || hs.some((h) => h.time.slice(0, 13) >= hourNow);

  const c = p.commute;
  const commuteOn = p.commuteOn ?? (c.enabled && c.days.includes(weekday(date)));
  let advice: Advice | null = null;
  let commute: CommuteAdvice | undefined;
  const dayLegs: Leg[] = [];

  if (commuteOn) {
    const mode = c.mode ?? activity;
    // Effort is picked for the day's activity; a commute by another mode keeps its own pace.
    const leg = { ...shared, activity: mode, effort: mode === activity ? effort : undefined };
    const out = legWindow(f.hours, date, c.out, c.legHours);
    const back = legWindow(f.hours, date, c.back, c.legHours);
    // Once the morning leg is past, today is just the trip home.
    const outLive = live(out);
    const backLive = live(back);
    const backLeg = (hours: Hour[]): Leg => ({ id: 'back', label: 'Back', phrase: 'the way home', activity: leg.activity, effort: leg.effort, hours });
    if (outLive && backLive) {
      commute = adviseCommute(leg, out, back, fmt) ?? undefined;
      advice = commute?.advice ?? null;
      if (commute) dayLegs.push({ id: 'out', label: 'Out', phrase: 'the way there', activity: leg.activity, effort: leg.effort, hours: out }, backLeg(back));
    } else if (backLive) {
      const rest = back.filter((h) => h.time.slice(0, 13) >= hourNow);
      advice = advise({ ...leg, hours: rest });
      dayLegs.push(backLeg(rest));
    }
  }
  if (!advice) {
    const start = isToday ? now : `${date}T${c.enabled ? c.out : '08:00'}`;
    const hours = selectWindow(f.hours, start, p.duration);
    advice = advise({ ...base, hours, ...(science ? { science: { ...science, exposureHours: p.duration } } : {}) });
    dayLegs.push(
      isToday
        ? { id: 'day', label: 'Rest of the day', phrase: 'the rest of the day', activity, effort, hours, exposureHours: p.duration }
        : { id: 'day', label: 'The day', phrase: 'the day', activity, effort, hours, exposureHours: p.duration },
    );
  }

  let legs: LegsAdvice | undefined;
  const routine = p.routines?.length ? routineLegs(f.hours, date, p.routines, isToday ? now : undefined) : [];
  if (routine.length) {
    const deg = (n: number) => fmtTemp(n, p.units.temp).replace('-', '−');
    legs = adviseLegs(shared, [...dayLegs, ...routine], fmt, deg) ?? undefined;
    if (legs) {
      advice = legs.advice;
      commute = undefined;
    }
  }
  if (!advice) return null;

  const startIdx = isToday ? Math.max(0, hourIndex(f.hours, now)) : Math.max(0, hourIndex(f.hours, `${date}T06:00`));
  const dayHours = isToday ? f.hours.slice(startIdx, startIdx + 24) : f.hours.slice(startIdx, startIdx + 18);
  return { advice, commute, legs, dayHours, windowTimes: new Set(advice.hours.map((h) => h.time)) };
}
