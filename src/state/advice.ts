// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { adviseCommute, type CommuteAdvice } from '../engine/commute';
import { advise } from '../engine/advise';
import { legWindow, selectWindow, hourIndex } from '../engine/window';
import { localNow } from '../engine/time';
import type { Activity, Advice, Hour } from '../engine/types';
import type { Forecast } from '../data/forecast-types';
import { timeFmt, weekday } from '../data/format';
import type { Settings } from '../data/store';
import type { Rating, WardrobeItem } from '../engine/types';

export interface DayPlan {
  advice: Advice;
  commute?: CommuteAdvice;
  /** Hours for the strip and the rain sentence. */
  dayHours: Hour[];
  windowTimes: Set<string>;
}

interface Ctx {
  settings: Settings;
  ratings: Rating[];
  wardrobe: WardrobeItem[];
  activity?: Activity;
  duration?: number;
  commute?: boolean;
}

/**
 * Builds the advice for one local date. Today starts from the current hour;
 * other days start at the commute's "out" time (or 08:00), which is when
 * people actually get dressed.
 */
export function planDay(f: Forecast, date: string, ctx: Ctx): DayPlan | null {
  const s = ctx.settings;
  const activity = ctx.activity ?? s.activity;
  const now = localNow(f.utcOffsetSeconds);
  const isToday = now.startsWith(date);
  const base = { activity, manualOffset: s.manualOffset, ratings: ctx.ratings, today: now.slice(0, 10), wardrobe: ctx.wardrobe };

  const commuteOn = ctx.commute ?? (s.commute.enabled && s.commute.days.includes(weekday(date)));
  let advice: Advice | null = null;
  let commute: CommuteAdvice | undefined;

  if (commuteOn) {
    const leg = { ...base, activity: s.commute.mode ?? activity };
    const out = legWindow(f.hours, date, s.commute.out, s.commute.legHours);
    const back = legWindow(f.hours, date, s.commute.back, s.commute.legHours);
    // Once the morning leg is past, today is just the trip home.
    const outLive = !isToday || out.some((h) => h.time.slice(0, 13) >= now.slice(0, 13));
    const backLive = !isToday || back.some((h) => h.time.slice(0, 13) >= now.slice(0, 13));
    if (outLive && backLive) {
      commute = adviseCommute(leg, out, back, timeFmt(s.units.clock)) ?? undefined;
      advice = commute?.advice ?? null;
    } else if (backLive) {
      advice = advise({ ...leg, hours: back.filter((h) => h.time.slice(0, 13) >= now.slice(0, 13)) });
    }
  }
  if (!advice) {
    const start = isToday ? now : `${date}T${s.commute.enabled ? s.commute.out : '08:00'}`;
    advice = advise({ ...base, hours: selectWindow(f.hours, start, ctx.duration ?? s.duration) });
  }
  if (!advice) return null;

  const startIdx = isToday ? Math.max(0, hourIndex(f.hours, now)) : Math.max(0, hourIndex(f.hours, `${date}T06:00`));
  const dayHours = isToday ? f.hours.slice(startIdx, startIdx + 24) : f.hours.slice(startIdx, startIdx + 18);
  return { advice, commute, dayHours, windowTimes: new Set(advice.hours.map((h) => h.time)) };
}

/** The rest of the local day, for the rain sentence. */
export function restOfDay(hours: Hour[], date: string): Hour[] {
  return hours.filter((h) => h.time.startsWith(date));
}
