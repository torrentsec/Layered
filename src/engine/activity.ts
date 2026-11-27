// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Activity, Effort } from './types';

/** °C added to the effective temperature. */
export const ACTIVITY_OFFSET: Record<Activity, number> = {
  walking: 0,
  standing: -3,
  // Riding into your own headwind costs more than apparent temperature admits.
  cycling: -4,
  transport: -1,
  running: 8,
  hiking: 3,
  // Lighter outerwear and a lot of standing about outside venues.
  night: -1,
  // The few minutes outside are mostly spent waiting at stops and crossings, not moving.
  office: -1,
  // Dressed for a quick trip to the shop: too short to cool down or warm up.
  indoors: 0,
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  walking: 'Walking',
  standing: 'Standing',
  cycling: 'Cycling',
  transport: 'Transport',
  running: 'Running',
  hiking: 'Hiking',
  night: 'Night out',
  office: 'Office day',
  indoors: 'Staying in',
};

// Everyday choices first, so the chips visible before scrolling are the useful ones.
export const ACTIVITIES: Activity[] = ['walking', 'office', 'transport', 'cycling', 'indoors', 'standing', 'running', 'hiking', 'night'];

/**
 * Hours outside that a day of this activity usually means. Indoor days only
 * meet the weather in short stretches, so a long window would dress you for
 * an afternoon spent at a desk.
 */
export const ACTIVITY_EXPOSURE: Partial<Record<Activity, number>> = {
  office: 2,
  indoors: 2,
};

export type CommuteMode = Extract<Activity, 'walking' | 'cycling' | 'transport'>;

export const COMMUTE_MODES: CommuteMode[] = ['walking', 'cycling', 'transport'];

export const COMMUTE_MODE_LABEL: Record<CommuteMode, string> = {
  walking: 'Walk',
  cycling: 'Cycle',
  transport: 'Public transport',
};

/** Sport where how hard you work changes how warm you get (US-067). */
export type EffortActivity = Extract<Activity, 'running' | 'cycling' | 'hiking'>;

export const EFFORT_ACTIVITIES: EffortActivity[] = ['running', 'cycling', 'hiking'];

export const EFFORTS: Effort[] = ['easy', 'steady', 'hard'];

export const EFFORT_LABEL: Record<Effort, string> = { easy: 'Easy', steady: 'Steady', hard: 'Hard' };

export function scalesWithEffort(a: Activity): a is EffortActivity {
  return (EFFORT_ACTIVITIES as Activity[]).includes(a);
}

/**
 * Body heat gained or lost against a steady session, °C. Running charts put
 * an easy jog about 3° cooler and a hard session about 3° warmer than a
 * steady run; hiking moves less because the pace range on foot is narrower.
 */
export const EFFORT_HEAT: Record<EffortActivity, Record<Effort, number>> = {
  running: { easy: -3, steady: 0, hard: 3 },
  hiking: { easy: -2, steady: 0, hard: 2 },
  cycling: { easy: -2, steady: 0, hard: 3 },
};

/**
 * Extra wind chill from riding faster, °C. Pushing harder on a bike makes
 * more heat but also more headwind, so the net warming is smaller than for
 * running; a gentle ride is slow enough to take the edge off the windchill.
 */
export const CYCLING_EFFORT_WIND: Record<Effort, number> = { easy: 1, steady: 0, hard: -1 };

/** Activity offset with effort applied; effort is ignored where it makes no difference. */
export function effortOffset(activity: Activity, effort: Effort = 'steady'): number {
  const base = ACTIVITY_OFFSET[activity];
  if (!scalesWithEffort(activity)) return base;
  const wind = activity === 'cycling' ? CYCLING_EFFORT_WIND[effort] : 0;
  return base + EFFORT_HEAT[activity][effort] + wind;
}
