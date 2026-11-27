// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { advise, adviseCommute, hourIndex, legWindow, notificationText, selectWindow } from '../../src/engine';
import type { Advice, BandId, ExtraId, Hour } from '../../src/engine';
import type { Forecast } from '../../src/data/forecast-types';
import { timeFmt, weekday } from '../../src/data/format';
import type { PushProfile } from '../../src/data/push-api';

/**
 * The app's planDay, minus the parts that need the browser: it reads `now`
 * from the caller instead of the clock, and settings from the push profile.
 * Ratings and the inventory stay on the device, so the outfit is the generic
 * one for the same band and extras.
 */

/** Settings' default time outside; the push profile doesn't carry it. */
export const DEFAULT_DURATION = 5;

export interface Plan {
  advice: Advice;
  /** The rest of the day, for the rain clause. */
  dayHours: Hour[];
}

export function planFor(f: Forecast, date: string, p: PushProfile, nowLocal: string): Plan | null {
  const isToday = nowLocal.startsWith(date);
  const hour = nowLocal.slice(0, 13);
  const base = { activity: p.activity, manualOffset: p.manualOffset, today: nowLocal.slice(0, 10), comfort: p.comfort };
  const c = p.commute;
  let advice: Advice | null = null;

  if (c.enabled && c.days.includes(weekday(date))) {
    const leg = { ...base, activity: c.mode ?? p.activity };
    const out = legWindow(f.hours, date, c.out, c.legHours);
    const back = legWindow(f.hours, date, c.back, c.legHours);
    const outLive = !isToday || out.some((h) => h.time.slice(0, 13) >= hour);
    const backLive = !isToday || back.some((h) => h.time.slice(0, 13) >= hour);
    if (outLive && backLive) advice = adviseCommute(leg, out, back, timeFmt(p.units.clock))?.advice ?? null;
    else if (backLive) advice = advise({ ...leg, hours: back.filter((h) => h.time.slice(0, 13) >= hour) });
  }
  if (!advice) {
    const start = isToday ? nowLocal : `${date}T${c.enabled ? c.out : '08:00'}`;
    advice = advise({ ...base, hours: selectWindow(f.hours, start, DEFAULT_DURATION) });
  }
  if (!advice) return null;

  const startIdx = Math.max(0, hourIndex(f.hours, isToday ? nowLocal : `${date}T06:00`));
  return { advice, dayHours: f.hours.slice(startIdx, startIdx + (isToday ? 24 : 18)) };
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
