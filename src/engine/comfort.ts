// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

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

/**
 * Offset from the comfort profile for an activity, applied alongside the
 * activity offset and the manual and learned offsets.
 */
export function comfortOffset(profile: ComfortProfile, activity: Activity): number {
  void activity;
  return SENSITIVITY_OFFSET[profile.sensitivity];
}
