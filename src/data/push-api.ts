// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { ComfortProfile } from '../engine/comfort';
import type { LearnSnapshot } from '../engine/learning';
import type { Activity, Effort } from '../engine/types';
import type { EngineChoice } from './engine-choice';
import type { Units } from './units';

/**
 * The contract between the app, the `/api/push/*` Pages Functions and the
 * `layered-push` Worker. A subscription carries only what the Worker needs to
 * run the engine for one place: coordinates rounded to two decimals, a time
 * zone and the person's settings. No identifiers beyond a random id.
 */

export const PUSH_API = {
  key: '/api/push/key',
  subscribe: '/api/push/subscribe',
  /** DELETE `${PUSH_API.subscription}/${id}` */
  subscription: '/api/push',
} as const;

export interface PushSchedule {
  /** Local "HH:MM" for today's outfit, or null to skip mornings. */
  morning: string | null;
  /** Local "HH:MM" for tomorrow's outfit (US-061), or null. */
  evening: string | null;
  /** 0 = Sunday, as Date#getDay. */
  days: number[];
  /** One extra alert when the day's advice changes materially (US-043). */
  changeAlerts: boolean;
}

export interface PushProfile {
  units: Units;
  activity: Activity;
  manualOffset: number;
  comfort: ComfortProfile;
  commute: { enabled: boolean; out: string; back: string; legHours: number; days: number[]; mode?: Activity };
  /*
   * The rest lets the Worker plan exactly as the app does. Each is optional so
   * subscriptions saved before them still parse; the Worker then falls back to
   * the default engine, Settings' default time outside, the bias prior from
   * comfort and manual offset, no votes and no routines.
   */
  engine?: EngineChoice;
  /** Hours outside, from Settings. */
  duration?: number;
  /** The device's learned clo bias. A single number: the votes behind it stay on the device. */
  bias?: number;
  /** How many votes `bias` rests on, so "Why this?" can say so. */
  biasCount?: number;
  /** The votes' pull as sums, which age exactly without the votes or their dates. */
  learned?: LearnSnapshot;
  /** Saved routines without their names, which no notification uses. */
  routines?: PushRoutine[];
}

export interface PushRoutine {
  time: string;
  hours: number;
  days: number[];
  activity: Activity;
  effort?: Effort;
}

/** More than anyone keeps; bounds the stored profile. */
export const MAX_PUSH_ROUTINES = 20;

export interface SubscribeRequest {
  /** Present when updating an existing subscription. */
  id?: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  lat: number;
  lon: number;
  /** IANA time zone, e.g. "Europe/London". */
  tz: string;
  schedule: PushSchedule;
  profile: PushProfile;
}

export interface SubscribeResponse {
  id: string;
}

export interface PushKeyResponse {
  /** VAPID application server key, base64url. */
  publicKey: string;
}

/** What the service worker receives in a push event. */
export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Upper bound on a subscribe request body; real ones are well under 2 KB. */
export const MAX_SUBSCRIBE_BYTES = 8 * 1024;
