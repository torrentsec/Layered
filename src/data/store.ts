// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { effect, signal, type Signal } from '@preact/signals';
import type { Activity, Effort, Rating, WardrobeItem } from '../engine/types';
import type { Inventory } from '../engine/inventory';
import { DEFAULT_COMFORT, type ComfortProfile } from '../engine/comfort';
import type { BiasState } from '../engine/science/types';
import { biasPrior, replayBias } from '../engine/science/personal';
import type { Place } from './openmeteo';
import { DEFAULT_UNITS, type Units } from './units';

export type Theme = 'system' | 'light' | 'dark';

export interface Commute {
  enabled: boolean;
  out: string;
  back: string;
  /** How long each leg keeps you outside, in hours. */
  legHours: number;
  /** 0 = Sunday, as Date#getDay. */
  days: number[];
  /** How you travel; unset means the legs follow the day's activity. */
  mode?: 'walking' | 'cycling' | 'transport';
}

export interface NotifyPrefs {
  enabled: boolean;
  /** Morning notification time, local "HH:MM". */
  time: string;
  days: number[];
  /** Evening heads-up with tomorrow's outfit (US-061). */
  evening?: boolean;
  eveningTime?: string;
  /** One extra alert if the day's advice changes materially (US-043). */
  changeAlerts?: boolean;
  subscriptionId?: string;
}

/** A recurring stretch outdoors beyond the commute: school run, dog walk (US-065). */
export interface Routine {
  id: string;
  name: string;
  /** Local "HH:MM". */
  time: string;
  hours: number;
  /** 0 = Sunday, as Date#getDay. */
  days: number[];
  activity: Activity;
  effort?: Effort;
}

export interface Settings {
  units: Units;
  activity: Activity;
  duration: number;
  commute: Commute;
  manualOffset: number;
  theme: Theme;
  placeId: string | null;
  notify: NotifyPrefs;
  syncCode?: string;
  syncedAt?: number;
  installHintSeen?: boolean;
}

export interface TripStop {
  id: string;
  place: Place;
  /** First and last local dates at this stop, inclusive. */
  start: string;
  end: string;
}

export interface Trip {
  id: string;
  name: string;
  stops: TripStop[];
  activities: Activity[];
  /** Packing list ticks, keyed by item id. */
  checked: Record<string, boolean>;
  createdAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  units: DEFAULT_UNITS,
  activity: 'walking',
  duration: 5,
  commute: { enabled: false, out: '08:00', back: '17:30', legHours: 1, days: [1, 2, 3, 4, 5] },
  manualOffset: 0,
  theme: 'system',
  placeId: null,
  notify: { enabled: false, time: '07:00', days: [1, 2, 3, 4, 5] },
};

const PREFIX = 'layered:v1:';

function load<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // Shallow-merge objects so settings added in later versions get defaults.
    return fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...parsed } : parsed;
  } catch {
    return fallback;
  }
}

function persisted<T>(name: string, fallback: T): Signal<T> {
  const s = signal(load(name, fallback));
  effect(() => {
    try {
      localStorage.setItem(PREFIX + name, JSON.stringify(s.value));
    } catch {
      // Private mode or quota; state still lives for this session.
    }
  });
  return s;
}

export const settings = persisted<Settings>('settings', DEFAULT_SETTINGS);
export const places = persisted<Place[]>('places', []);
/** Wardrobe v1: named items. Migrated into `inventory` and then retired. */
export const wardrobe = persisted<WardrobeItem[]>('wardrobe', []);
/** Category inventory (E02). A missing category means "not set". */
export const inventory = persisted<Inventory>('inventory', {});
export const comfort = persisted<ComfortProfile>('comfort', DEFAULT_COMFORT);
export const routines = persisted<Routine[]>('routines', []);
/**
 * Learned warmth per garment, in warmth points, keyed `${category}:${thickness}` (US-039).
 * Kept apart from personal sensitivity so a cold coat doesn't make you "feel the cold".
 */
export const garmentWarmth = persisted<Record<string, number>>('garmentWarmth', {});

/** One day's advice as shown, with the weather that drove it and how it went (US-049 to US-052). */
export interface DayRecord {
  date: string;
  activity: Activity;
  effective: number;
  band: string;
  layers: string[];
  extras: string[];
  maxRain: number;
  maxWind: number;
  rating?: -1 | 0 | 1;
  /** Set when advice couldn't be given or the wardrobe left gaps. */
  issue?: 'no-forecast' | 'engine-error' | 'incomplete-inventory';
}
/** Most recent first, capped at 60 days; never leaves the device except through the user's own sync. */
export const history = persisted<DayRecord[]>('history', []);

/** First-run flow finished or skipped (US-006). */
export const onboarded = persisted<boolean>('onboarded', false);
export const trips = persisted<Trip[]>('trips', []);
export const ratings = persisted<Rating[]>('ratings', []);
/**
 * Personal clo bias for the science engine. Derived from the comfort profile,
 * the manual offset and every stored vote, and rebuilt when any of them
 * changes, so a replaced or imported vote is never counted twice.
 */
export const cloBias = persisted<BiasState>('cloBias', biasPrior(DEFAULT_COMFORT, 0));
effect(() => {
  const next = replayBias(biasPrior(comfort.value, settings.value.manualOffset), ratings.value);
  // Settings change for many reasons; skip the write when the bias itself hasn't moved.
  if (JSON.stringify(next) !== JSON.stringify(cloBias.peek())) cloBias.value = next;
});
/** Last device location, kept so "Here" works offline. */
export const here = persisted<Place | null>('here', null);

export function patchSettings(p: Partial<Settings>): void {
  settings.value = { ...settings.value, ...p };
}

/** Everything a person owns, for export, import and sync. */
export interface Bundle {
  version: 1;
  updatedAt: number;
  settings: Settings;
  places: Place[];
  wardrobe: WardrobeItem[];
  inventory?: Inventory;
  comfort?: ComfortProfile;
  routines?: Routine[];
  garmentWarmth?: Record<string, number>;
  history?: DayRecord[];
  trips: Trip[];
  ratings: Rating[];
  /** Carried for other readers of the file; on import it is rebuilt from the votes above. */
  cloBias?: BiasState;
}

export function exportBundle(): Bundle {
  return {
    version: 1,
    updatedAt: Date.now(),
    settings: settings.value,
    places: places.value,
    wardrobe: wardrobe.value,
    inventory: inventory.value,
    comfort: comfort.value,
    routines: routines.value,
    garmentWarmth: garmentWarmth.value,
    history: history.value,
    trips: trips.value,
    ratings: ratings.value,
    cloBias: cloBias.value,
  };
}

export function importBundle(b: unknown): void {
  if (!b || typeof b !== 'object' || (b as Bundle).version !== 1) throw new Error('That file isn’t a Layered export');
  const x = b as Bundle;
  // A device keeps its own push subscription; it belongs to this browser, not the data.
  const keepNotify = settings.value.notify;
  settings.value = { ...DEFAULT_SETTINGS, ...x.settings, notify: keepNotify };
  places.value = Array.isArray(x.places) ? x.places : [];
  wardrobe.value = Array.isArray(x.wardrobe) ? x.wardrobe : [];
  inventory.value = x.inventory && typeof x.inventory === 'object' ? x.inventory : {};
  comfort.value = { ...DEFAULT_COMFORT, ...x.comfort };
  routines.value = Array.isArray(x.routines) ? x.routines : [];
  garmentWarmth.value = x.garmentWarmth && typeof x.garmentWarmth === 'object' ? x.garmentWarmth : {};
  history.value = Array.isArray(x.history) ? x.history : [];
  trips.value = Array.isArray(x.trips) ? x.trips : [];
  ratings.value = Array.isArray(x.ratings) ? x.ratings : [];
}

export const uid = (): string => crypto.randomUUID().slice(0, 8);
