// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { ACTIVITY_EXPOSURE } from '../engine/activity';
import type { Activity } from '../engine/types';

/** The duration an indoor day replaced, and the one it set, so it can be given back. */
export interface Swap {
  was: number;
  set: number;
}

export interface OutFor {
  duration: number;
  swap: Swap | null;
}

/**
 * "Out for" after picking an activity. Office and indoor days set their own
 * short exposure; moving on to anything else restores what was there before,
 * unless the user has picked a duration in between (`swap` is then null).
 */
export function outForAfter(activity: Activity, now: OutFor): OutFor {
  const hours = ACTIVITY_EXPOSURE[activity];
  if (hours !== undefined) return { duration: hours, swap: { was: now.swap?.was ?? now.duration, set: hours } };
  if (now.swap && now.duration === now.swap.set) return { duration: now.swap.was, swap: null };
  return { duration: now.duration, swap: null };
}
