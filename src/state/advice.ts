// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { adviseCommute, type CommuteAdvice } from '../engine/commute';
import { advise } from '../engine/advise';
import { adviseLegs, routineLegs, type Leg, type LegsAdvice } from '../engine/routines';
import { legWindow, selectWindow, hourIndex } from '../engine/window';
import { localNow } from '../engine/time';
import type { Activity, Advice, Effort, Hour } from '../engine/types';
import type { Forecast } from '../data/forecast-types';
import { timeFmt, weekday } from '../data/format';
import { fmtTemp } from '../data/units';
import { garmentWarmth, type Routine, type Settings } from '../data/store';
import { biasState } from '../data/bias';
import type { GarmentWarmth } from '../engine/garment-learning';
import type { Rating } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import type { ComfortProfile } from '../engine/comfort';
import type { BiasState } from '../engine/science/types';

export interface DayPlan {
  advice: Advice;
  commute?: CommuteAdvice;
  /** Set when routines join the day; replaces `commute`, whose legs it includes. */
  legs?: LegsAdvice;
  /** Hours for the strip and the rain sentence. */
  dayHours: Hour[];
  windowTimes: Set<string>;
}

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
 * Builds the advice for one local date. Today starts from the current hour;
 * other days start at the commute's "out" time (or 08:00), which is when
 * people actually get dressed.
 */
export function planDay(f: Forecast, date: string, ctx: Ctx): DayPlan | null {
  const s = ctx.settings;
  const activity = ctx.activity ?? s.activity;
  const effort = ctx.effort;
  const now = localNow(f.utcOffsetSeconds);
  const isToday = now.startsWith(date);
  const fmt = timeFmt(s.units.clock);
  const bias = ctx.bias ?? biasState();
  const science = s.engine === 'science' ? { place: { lat: f.lat, lon: f.lon, utcOffsetSeconds: f.utcOffsetSeconds }, bias: bias.mean, biasCount: bias.count } : undefined;
  const shared = {
    manualOffset: s.manualOffset,
    ratings: ctx.ratings,
    today: now.slice(0, 10),
    inventory: ctx.inventory,
    comfort: ctx.comfort,
    garmentWarmth: ctx.garmentWarmth ?? garmentWarmth.value,
    ...(science ? { science } : {}),
  };
  const base = { ...shared, activity, effort };
  const hourNow = now.slice(0, 13);
  const live = (hs: Hour[]) => !isToday || hs.some((h) => h.time.slice(0, 13) >= hourNow);

  const commuteOn = ctx.commute ?? (s.commute.enabled && s.commute.days.includes(weekday(date)));
  let advice: Advice | null = null;
  let commute: CommuteAdvice | undefined;
  const dayLegs: Leg[] = [];

  if (commuteOn) {
    const mode = s.commute.mode ?? activity;
    // Effort is picked for the day's activity; a commute by another mode keeps its own pace.
    const leg = { ...shared, activity: mode, effort: mode === activity ? effort : undefined };
    const out = legWindow(f.hours, date, s.commute.out, s.commute.legHours);
    const back = legWindow(f.hours, date, s.commute.back, s.commute.legHours);
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
    const start = isToday ? now : `${date}T${s.commute.enabled ? s.commute.out : '08:00'}`;
    const duration = ctx.duration ?? s.duration;
    const hours = selectWindow(f.hours, start, duration);
    advice = advise({ ...base, hours, ...(science ? { science: { ...science, exposureHours: duration } } : {}) });
    dayLegs.push(
      isToday
        ? { id: 'day', label: 'Rest of the day', phrase: 'the rest of the day', activity, effort, hours, exposureHours: duration }
        : { id: 'day', label: 'The day', phrase: 'the day', activity, effort, hours, exposureHours: duration },
    );
  }

  let legs: LegsAdvice | undefined;
  const routine = ctx.routines?.length ? routineLegs(f.hours, date, ctx.routines, isToday ? now : undefined) : [];
  if (routine.length) {
    const deg = (c: number) => fmtTemp(c, s.units.temp).replace('-', '−');
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

/** The rest of the local day, for the rain sentence. */
export function restOfDay(hours: Hour[], date: string): Hour[] {
  return hours.filter((h) => h.time.startsWith(date));
}
