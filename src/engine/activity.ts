// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { Activity } from './types';

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
