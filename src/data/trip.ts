// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { advise } from '../engine/advise';
import { combineAdvice, packingList, type PackItem } from '../engine/packing';
import { selectWindow } from '../engine/window';
import type { Activity, Advice, Hour, Rating } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import type { ComfortProfile } from '../engine/comfort';
import type { GarmentWarmth } from '../engine/garment-learning';
import type { BiasState, WeatherPlace } from '../engine/science/types';
import type { EngineChoice } from './engine-choice';
import { getForecast } from './cache';
import { addDays } from './format';
import { fetchTypical } from './openmeteo';
import type { Trip, TripStop } from './store';

export type DaySource = 'forecast' | 'typical' | 'unavailable';

export interface TripDayPlan {
  date: string;
  source: DaySource;
  advice: Advice | null;
}

export interface StopPlan {
  stop: TripStop;
  days: TripDayPlan[];
  error?: string;
}

export interface TripPlan {
  stops: StopPlan[];
  packing: PackItem[];
  dayCount: number;
}

// When each activity happens on a trip day. Evenings out are judged on the evening.
const WINDOW: Record<Activity, [string, number]> = {
  walking: ['09:00', 9],
  standing: ['10:00', 6],
  cycling: ['09:00', 8],
  transport: ['09:00', 9],
  running: ['07:00', 2],
  hiking: ['09:00', 8],
  night: ['19:00', 5],
  office: ['08:00', 2],
  indoors: ['11:00', 2],
};

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 60; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface Ctx {
  manualOffset: number;
  ratings: Rating[];
  inventory: Inventory;
  comfort: ComfortProfile;
  today: string;
  /** The same engine, bias and learned warmth as Today, so a trip day dresses you as Today would. */
  engine: EngineChoice;
  bias: Pick<BiasState, 'mean' | 'count'>;
  garmentWarmth?: GarmentWarmth;
}

/**
 * Typical days come without a time zone; solar time from the longitude puts
 * the sun within an hour or so of right, which is all an average day can claim.
 */
export const solarOffset = (lon: number): number => Math.round(lon / 15) * 3600 + 0; // + 0 turns -0 into 0

export function dayAdvice(hours: Hour[], date: string, activities: Activity[], ctx: Ctx, place?: WeatherPlace): Advice | null {
  const { engine, bias, ...rest } = ctx;
  const list = (activities.length ? activities : (['walking'] as Activity[]))
    .map((a) => {
      const [hhmm, h] = WINDOW[a];
      const window = selectWindow(hours, `${date}T${hhmm}`, h).filter((x) => x.time.startsWith(date));
      // Each activity's window is the time spent outside for it.
      const science = engine === 'science' && place ? { science: { place, bias: bias.mean, biasCount: bias.count, exposureHours: h } } : {};
      return advise({ hours: window, activity: a, ...rest, ...science });
    })
    .filter((a): a is Advice => !!a);
  return combineAdvice(list);
}

const TYPICAL_KEY = 'layered:typical:';
const TYPICAL_TTL = 7 * 86_400_000;

async function typicalHours(stop: TripStop, dates: string[]): Promise<Map<string, Hour[]>> {
  const key = `${TYPICAL_KEY}${stop.place.lat.toFixed(2)},${stop.place.lon.toFixed(2)}:${dates[0]}:${dates.at(-1)}`;
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; days: [string, Hour[]][] } | null;
    if (hit && Date.now() - hit.at < TYPICAL_TTL) return new Map(hit.days);
  } catch {
    // Corrupt entry; refetch below.
  }
  const days = await fetchTypical(stop.place.lat, stop.place.lon, dates);
  const entries = days.map((d) => [d.date, d.hours] as [string, Hour[]]);
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), days: entries }));
  } catch {
    // Quota: fine to recompute next time.
  }
  return new Map(entries);
}

async function planStop(stop: TripStop, activities: Activity[], ctx: Ctx): Promise<StopPlan> {
  const dates = datesBetween(stop.start < ctx.today ? ctx.today : stop.start, stop.end);
  const byDate = new Map<string, { source: DaySource; hours: Hour[] }>();
  let error: string | undefined;
  let place: WeatherPlace = { lat: stop.place.lat, lon: stop.place.lon, utcOffsetSeconds: solarOffset(stop.place.lon) };

  try {
    const { forecast } = await getForecast(stop.place.lat, stop.place.lon);
    place = { ...place, utcOffsetSeconds: forecast.utcOffsetSeconds };
    const last = forecast.days.at(-1)?.date ?? '';
    for (const d of dates) if (d <= last) byDate.set(d, { source: 'forecast', hours: forecast.hours });
  } catch {
    error = 'Forecast unavailable';
  }

  const beyond = dates.filter((d) => !byDate.has(d));
  if (beyond.length) {
    try {
      const typical = await typicalHours(stop, beyond);
      for (const d of beyond) {
        const h = typical.get(d);
        if (h) byDate.set(d, { source: 'typical', hours: h });
      }
    } catch {
      error = 'Typical weather unavailable right now';
    }
  }

  return {
    stop,
    error,
    days: dates.map((date) => {
      const got = byDate.get(date);
      return got ? { date, source: got.source, advice: dayAdvice(got.hours, date, activities, ctx, place) } : { date, source: 'unavailable', advice: null };
    }),
  };
}

export async function planTrip(trip: Trip, ctx: Ctx): Promise<TripPlan> {
  const stops = await Promise.all(trip.stops.map((s) => planStop(s, trip.activities, ctx)));
  const advices = stops.flatMap((s) => s.days.map((d) => d.advice)).filter((a): a is Advice => !!a);
  const dayCount = trip.stops.reduce((n, s) => n + datesBetween(s.start, s.end).length, 0);
  return { stops, packing: packingList(advices), dayCount };
}

/** Stops sorted by arrival, so the trip reads in order however it was entered. */
export function orderedStops(stops: TripStop[]): TripStop[] {
  return [...stops].sort((a, b) => a.start.localeCompare(b.start));
}
