// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import type { Level } from './inventory';
import type { Activity } from './types';

export type Sensitivity = 'cold' | 'average' | 'warm';

/** How someone experiences weather (US-004, US-005). Everything but sensitivity is optional. */
export interface ComfortProfile {
  sensitivity: Sensitivity;
  overheatWhenWalking?: boolean;
  coldWhenStill?: boolean;
  windTolerance?: Level;
  rainTolerance?: Level;
}

export const DEFAULT_COMFORT: ComfortProfile = { sensitivity: 'average' };

/** °C added to the effective temperature for the base sensitivity. */
export const SENSITIVITY_OFFSET: Record<Sensitivity, number> = { cold: -2, average: 0, warm: 2 };

/** °C added for someone who overheats on the move, so they are told to wear less. */
export const OVERHEAT_WHEN_ACTIVE_OFFSET = 1.5;
/** °C added for someone who chills quickly once they stop moving. */
export const COLD_WHEN_STILL_OFFSET = -1.5;

// Listed rather than derived from ACTIVITY_OFFSET so a newly added activity
// gets no preference adjustment until someone decides where it belongs.
export const ACTIVE_ACTIVITIES: readonly Activity[] = ['walking', 'hiking', 'running', 'cycling'];
// An office day's exposure is mostly waiting at stops and crossings.
export const STILL_ACTIVITIES: readonly Activity[] = ['standing', 'transport', 'night', 'office'];

/**
 * Offset from the comfort profile for an activity, applied alongside the
 * activity offset and the manual and learned offsets.
 */
export function comfortOffset(profile: ComfortProfile, activity: Activity): number {
  // Imported or synced profiles may carry a sensitivity from a later version.
  let offset = SENSITIVITY_OFFSET[profile.sensitivity] ?? 0;
  if (profile.overheatWhenWalking && ACTIVE_ACTIVITIES.includes(activity)) offset += OVERHEAT_WHEN_ACTIVE_OFFSET;
  if (profile.coldWhenStill && STILL_ACTIVITIES.includes(activity)) offset += COLD_WHEN_STILL_OFFSET;
  return offset;
}
