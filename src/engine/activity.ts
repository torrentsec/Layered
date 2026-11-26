// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

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
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  walking: 'Walking',
  standing: 'Standing',
  cycling: 'Cycling',
  transport: 'Transport',
  running: 'Running',
  hiking: 'Hiking',
  night: 'Night out',
};

export const ACTIVITIES = Object.keys(ACTIVITY_OFFSET) as Activity[];
